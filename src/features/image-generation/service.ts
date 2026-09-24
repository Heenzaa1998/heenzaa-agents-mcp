import {
  editImageSchema,
  generateImageSchema,
} from "@/features/image-generation/contracts";
import {
  persistRemoteMedia,
  type MediaItem,
  type PersistOptions,
} from "@/features/media/service";
import { kieClient, type KieClient } from "@/server/kie/client";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";

type ImageGenerator = Pick<KieClient, "generateImage">;
type ImageEditor = Pick<KieClient, "editImage">;
type MediaPersister = (
  urls: string[],
  options: PersistOptions,
) => Promise<MediaItem[]>;

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

      span.setAttribute("app.image.aspect_ratio", parsed.aspect_ratio);
      span.setAttribute("app.image.resolution", parsed.resolution);

      const result = await client.generateImage({
        prompt: parsed.prompt,
        aspectRatio: parsed.aspect_ratio,
        resolution: parsed.resolution,
        background: parsed.background,
      });
      const media = await persist(result.urls, {
        prefix: "images",
        taskId: result.taskId,
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

      span.setAttribute("app.image.aspect_ratio", parsed.aspect_ratio);
      span.setAttribute("app.image.input_count", parsed.image_urls.length);

      const result = await client.editImage({
        prompt: parsed.prompt,
        imageUrls: parsed.image_urls,
        aspectRatio: parsed.aspect_ratio,
        quality: parsed.quality,
      });
      const media = await persist(result.urls, {
        prefix: "images",
        taskId: result.taskId,
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
