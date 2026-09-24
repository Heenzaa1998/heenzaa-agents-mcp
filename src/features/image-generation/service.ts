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
import {
  persistRemoteMedia,
  type MediaItem,
  type PersistOptions,
} from "@/features/media/service";
import {
  IMAGE_TO_IMAGE_MODEL,
  kieClient,
  TEXT_TO_IMAGE_MODEL,
  type KieClient,
} from "@/server/kie/client";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";

type ImageGenerator = Pick<KieClient, "generateImage">;
type ImageEditor = Pick<KieClient, "editImage">;
type MediaPersister = (
  urls: string[],
  options: PersistOptions,
) => Promise<MediaItem[]>;
type HistoryWriter = Pick<GenerationLog, "record">;

export type ImageGenerationResult = {
  taskId: string;
  media: MediaItem[];
};

function countStored(media: MediaItem[]) {
  return media.filter((item) => item.key !== null).length;
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
      };

      span.setAttribute("app.image.aspect_ratio", parsed.aspect_ratio);
      span.setAttribute("app.image.resolution", parsed.resolution);

      let result;

      try {
        result = await client.generateImage({
          prompt: parsed.prompt,
          aspectRatio: parsed.aspect_ratio,
          resolution: parsed.resolution,
          background: parsed.background,
        });
      } catch (error) {
        await history.record({
          ...entry,
          status: "fail",
          taskId: null,
          error: describeError(error),
        });
        throw error;
      }

      const media = await persist(result.urls, {
        prefix: "images",
        taskId: result.taskId,
      });

      await history.record({
        ...entry,
        status: "success",
        taskId: result.taskId,
        media: toMediaRefs(media),
      });

      span.setAttribute("app.image.result_count", media.length);
      span.setAttribute("app.image.stored_count", countStored(media));

      logger.info(
        {
          operation: "generate_image",
          result_count: media.length,
          stored_count: countStored(media),
        },
        "Image generated",
      );

      return { taskId: result.taskId, media };
    },
  );
}

export async function editImage(
  input: unknown,
  client: ImageEditor = kieClient,
  persist: MediaPersister = persistRemoteMedia,
  history: HistoryWriter = generationLog,
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
      const entry = {
        kind: "image" as const,
        operation: "edit_image",
        model: IMAGE_TO_IMAGE_MODEL,
        prompt: parsed.prompt,
      };

      span.setAttribute("app.image.aspect_ratio", parsed.aspect_ratio);
      span.setAttribute("app.image.input_count", parsed.image_urls.length);

      let result;

      try {
        result = await client.editImage({
          prompt: parsed.prompt,
          imageUrls: parsed.image_urls,
          aspectRatio: parsed.aspect_ratio,
          quality: parsed.quality,
        });
      } catch (error) {
        await history.record({
          ...entry,
          status: "fail",
          taskId: null,
          error: describeError(error),
        });
        throw error;
      }

      const media = await persist(result.urls, {
        prefix: "images",
        taskId: result.taskId,
      });

      await history.record({
        ...entry,
        status: "success",
        taskId: result.taskId,
        media: toMediaRefs(media),
      });

      span.setAttribute("app.image.result_count", media.length);
      span.setAttribute("app.image.stored_count", countStored(media));

      logger.info(
        {
          operation: "edit_image",
          result_count: media.length,
          stored_count: countStored(media),
        },
        "Image edited",
      );

      return { taskId: result.taskId, media };
    },
  );
}
