import {
  persistRemoteMedia,
  type MediaItem,
  type PersistOptions,
} from "@/features/media/service";
import {
  generateVideoSchema,
  getTaskStatusSchema,
} from "@/features/video-generation/contracts";
import { kieClient, type KieClient } from "@/server/kie/client";
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

      span.setAttribute(
        "app.video.mode",
        parsed.image_url ? "image_to_video" : "text_to_video",
      );
      span.setAttribute("app.video.duration", parsed.duration);

      const { taskId, model } = await client.startVideo({
        prompt: parsed.prompt,
        imageUrl: parsed.image_url,
        aspectRatio: parsed.aspect_ratio,
        duration: parsed.duration,
        sound: parsed.sound,
      });

      logger.info({ operation: "start_video", model }, "Video task started");

      return { taskId, model, duration: parsed.duration };
    },
  );
}

export async function getTaskStatus(
  input: unknown,
  client: TaskReader = kieClient,
  persist: MediaPersister = persistRemoteMedia,
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
      }

      return result;
    },
  );
}
