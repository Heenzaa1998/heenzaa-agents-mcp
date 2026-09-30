import {
  describeError,
  generationLog,
  toMediaRefs,
  type GenerationLog,
} from "@/features/generations/service";
import {
  persistRemoteMedia,
  resolveMediaInputs,
  type MediaItem,
  type MediaResolver,
  type PersistOptions,
} from "@/features/media/service";
import {
  generateVideoSchema,
  getTaskStatusSchema,
} from "@/features/video-generation/contracts";
import {
  kieClient,
  videoModelFor,
  type KieClient,
  type StartVideoParams,
} from "@/server/kie/client";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";

type VideoStarter = Pick<KieClient, "startVideo">;
type TaskReader = Pick<KieClient, "getTask">;
type MediaPersister = (
  urls: string[],
  options: PersistOptions,
) => Promise<MediaItem[]>;

export type StartVideoResult = {
  taskId: string;
  model: string;
  duration: string;
};

export type TaskStatusResult = {
  taskId: string;
  model: string;
  state: string;
  progress?: number;
  media?: MediaItem[];
  failReason?: string;
};

export async function startVideo(
  input: unknown,
  client: VideoStarter = kieClient,
  history: Pick<GenerationLog, "record"> = generationLog,
  resolve: MediaResolver = resolveMediaInputs,
): Promise<StartVideoResult> {
  return withSpan(
    "video-generation.start",
    {
      attributes: {
        "app.feature": "video-generation",
        "app.operation": "start_video",
      },
    },
    async (span) => {
      const parsed = generateVideoSchema.parse(input);
      const entry = {
        kind: "video" as const,
        operation: "generate_video",
        prompt: parsed.prompt,
        project: parsed.project,
        shot: parsed.shot,
        durationSeconds: Number(parsed.duration),
      };

      // Storage keys become presigned links before KIE sees them.
      const [imageUrl] = parsed.image_url ? await resolve([parsed.image_url]) : [undefined];
      const [endImageUrl] = parsed.end_image_url ? await resolve([parsed.end_image_url]) : [undefined];
      const elements = parsed.elements
        ? await Promise.all(
            parsed.elements.map(async (element) => ({
              name: element.name,
              description: element.description,
              imageUrls: await resolve(element.image_urls),
            })),
          )
        : undefined;

      const params: StartVideoParams = {
        model: parsed.model,
        prompt: parsed.prompt,
        imageUrl,
        aspectRatio: parsed.aspect_ratio,
        duration: parsed.duration,
        sound: parsed.sound,
        ...(parsed.model === "kling-3.0"
          ? {
              mode: parsed.mode,
              endImageUrl,
              elements,
            }
          : {}),
      };

      span.setAttribute("app.video.model", parsed.model);
      span.setAttribute(
        "app.video.mode",
        parsed.image_url ? "image_to_video" : "text_to_video",
      );
      span.setAttribute("app.video.duration", parsed.duration);
      span.setAttribute("app.video.element_count", parsed.elements?.length ?? 0);

      let started;

      try {
        started = await client.startVideo(params);
      } catch (error) {
        await history.record({
          ...entry,
          model: videoModelFor(params),
          status: "fail",
          taskId: null,
          error: describeError(error),
        });
        throw error;
      }

      await history.record({
        ...entry,
        model: started.model,
        status: "pending",
        taskId: started.taskId,
      });

      logger.info(
        { operation: "start_video", model: started.model },
        "Video task started",
      );

      return {
        taskId: started.taskId,
        model: started.model,
        duration: parsed.duration,
      };
    },
  );
}

export async function getTaskStatus(
  input: unknown,
  client: TaskReader = kieClient,
  persist: MediaPersister = persistRemoteMedia,
  history: Pick<GenerationLog, "finish"> = generationLog,
): Promise<TaskStatusResult> {
  return withSpan(
    "video-generation.get_status",
    {
      attributes: {
        "app.feature": "video-generation",
        "app.operation": "get_task_status",
      },
    },
    async (span) => {
      const { task_id: taskId } = getTaskStatusSchema.parse(input);
      const status = await client.getTask(taskId);

      span.setAttribute("app.task.state", status.state);

      const result: TaskStatusResult = {
        taskId: status.taskId,
        model: status.model,
        state: status.state,
        progress: status.progress,
        failReason: status.failReason,
      };

      if (status.state === "success" && status.urls) {
        // Storage keys are derived from the task id, so checking a finished
        // task again reuses the stored file instead of uploading it twice.
        result.media = await persist(status.urls, {
          prefix: status.model.includes("video") ? "videos" : "images",
          taskId: status.taskId,
        });

        await history.finish(status.taskId, {
          status: "success",
          media: toMediaRefs(result.media),
          ...(status.creditsConsumed !== undefined ? { credits: status.creditsConsumed } : {}),
        });
      }

      if (status.state === "fail") {
        await history.finish(status.taskId, {
          status: "fail",
          error: status.failReason ?? null,
        });
      }

      return result;
    },
  );
}
