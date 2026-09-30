import {
  editImageSchema,
  generateImageSchema,
} from "@/features/image-generation/contracts";
import {
  describeError,
  generationLog,
  toMediaRefs,
  type GenerationLog,
} from "@/features/generations/service";
import { toStoredKey } from "@/features/media/contracts";
import {
  persistRemoteMedia,
  resolveMediaInputs,
  type MediaItem,
  type MediaResolver,
  type PersistOptions,
} from "@/features/media/service";
import {
  IMAGE_TO_IMAGE_MODEL,
  kieClient,
  LEGACY_IMAGE_TO_IMAGE_MODEL,
  TEXT_TO_IMAGE_MODEL,
  type EditImageParams,
  type ImageTaskHooks,
  type KieClient,
  type KieImageResult,
} from "@/server/kie/client";
import { logger } from "@/server/logger";
import type { Span } from "@opentelemetry/api";
import { withSpan } from "@/server/observability/tracing";

type ImageGenerator = Pick<KieClient, "generateImage">;
type ImageEditor = Pick<KieClient, "editImage">;
type MediaPersister = (
  urls: string[],
  options: PersistOptions,
) => Promise<MediaItem[]>;
type HistoryWriter = Pick<GenerationLog, "record" | "finish">;

export type ImageGenerationResult = {
  taskId: string;
  media: MediaItem[];
  // True when KIE was still working after we stopped waiting; the media is
  // empty and get_task_status finishes the job later.
  pending: boolean;
};

type HistoryEntry = {
  kind: "image";
  operation: string;
  model: string;
  prompt: string;
  project?: string;
  shot?: string;
  inputs?: string[];
};

function countStored(media: MediaItem[]) {
  return media.filter((item) => item.key !== null).length;
}

// Shared tail of generate/edit: record the task as soon as KIE accepts it,
// then close it with the outcome. A task that outlives the wait stays pending.
async function runImageJob(
  entry: HistoryEntry,
  start: (hooks: ImageTaskHooks) => Promise<KieImageResult>,
  persist: MediaPersister,
  history: HistoryWriter,
  span: Span,
): Promise<ImageGenerationResult> {
  let started: string | null = null;
  let result: KieImageResult;

  try {
    result = await start({
      onStarted: async (taskId) => {
        started = taskId;
        await history.record({ ...entry, status: "pending", taskId });
      },
    });
  } catch (error) {
    if (started) {
      await history.finish(started, { status: "fail", error: describeError(error) });
    } else {
      await history.record({ ...entry, status: "fail", taskId: null, error: describeError(error) });
    }
    throw error;
  }

  if (result.state === "pending") {
    span.setAttribute("app.image.pending", true);
    logger.info({ operation: entry.operation, task_id: result.taskId }, "Image task still running");

    return { taskId: result.taskId, media: [], pending: true };
  }

  const media = await persist(result.urls, { prefix: "images", taskId: result.taskId });

  await history.finish(result.taskId, {
    status: "success",
    media: toMediaRefs(media),
    ...(result.creditsConsumed !== undefined ? { credits: result.creditsConsumed } : {}),
  });

  span.setAttribute("app.image.result_count", media.length);
  span.setAttribute("app.image.stored_count", countStored(media));
  logger.info(
    { operation: entry.operation, result_count: media.length, stored_count: countStored(media) },
    entry.operation === "edit_image" ? "Image edited" : "Image generated",
  );

  return { taskId: result.taskId, media, pending: false };
}

export async function generateImage(
  input: unknown,
  client: ImageGenerator = kieClient,
  persist: MediaPersister = persistRemoteMedia,
  history: HistoryWriter = generationLog,
): Promise<ImageGenerationResult> {
  return withSpan(
    "image-generation.generate",
    {
      attributes: {
        "app.feature": "image-generation",
        "app.operation": "generate_image",
      },
    },
    async (span) => {
      const parsed = generateImageSchema.parse(input);
      const entry = {
        kind: "image" as const,
        operation: "generate_image",
        model: TEXT_TO_IMAGE_MODEL,
        prompt: parsed.prompt,
        project: parsed.project,
        shot: parsed.shot,
      };

      span.setAttribute("app.image.aspect_ratio", parsed.aspect_ratio);
      span.setAttribute("app.image.resolution", parsed.resolution);

      return runImageJob(
        entry,
        (hooks) =>
          client.generateImage(
            {
              prompt: parsed.prompt,
              aspectRatio: parsed.aspect_ratio,
              resolution: parsed.resolution,
              background: parsed.background,
            },
            hooks,
          ),
        persist,
        history,
        span,
      );
    },
  );
}

export async function editImage(
  input: unknown,
  client: ImageEditor = kieClient,
  persist: MediaPersister = persistRemoteMedia,
  history: HistoryWriter = generationLog,
  resolve: MediaResolver = resolveMediaInputs,
): Promise<ImageGenerationResult> {
  return withSpan(
    "image-generation.edit",
    {
      attributes: {
        "app.feature": "image-generation",
        "app.operation": "edit_image",
      },
    },
    async (span) => {
      const parsed = editImageSchema.parse(input);
      const legacy = parsed.model === "gpt-image-1.5";
      const entry = {
        kind: "image" as const,
        operation: "edit_image",
        model: legacy ? LEGACY_IMAGE_TO_IMAGE_MODEL : IMAGE_TO_IMAGE_MODEL,
        prompt: parsed.prompt,
        project: parsed.project,
        shot: parsed.shot,
        inputs: parsed.image_urls.map(toStoredKey),
      };

      // Storage keys become presigned links before KIE sees them.
      const shared = { prompt: parsed.prompt, imageUrls: await resolve(parsed.image_urls) };
      const params: EditImageParams = legacy
        ? {
            ...shared,
            model: "gpt-image-1.5",
            // The older model has no auto ratio; 3:2 was its default.
            aspectRatio: parsed.aspect_ratio === "auto" ? "3:2" : parsed.aspect_ratio,
            quality: parsed.quality ?? "medium",
          }
        : {
            ...shared,
            model: "gpt-image-2",
            aspectRatio: parsed.aspect_ratio,
            resolution: parsed.resolution,
            background: parsed.background,
          };

      span.setAttribute("app.image.model", parsed.model);
      span.setAttribute("app.image.aspect_ratio", params.aspectRatio);
      span.setAttribute("app.image.input_count", parsed.image_urls.length);

      return runImageJob(entry, (hooks) => client.editImage(params, hooks), persist, history, span);
    },
  );
}
