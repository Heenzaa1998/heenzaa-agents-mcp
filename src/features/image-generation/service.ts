import {
  editImageSchema,
  generateImageSchema,
} from "@/features/image-generation/contracts";
import { kieClient, type KieClient, type KieImageResult } from "@/server/kie/client";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";

type ImageGenerator = Pick<KieClient, "generateImage">;
type ImageEditor = Pick<KieClient, "editImage">;

export async function generateImage(
  input: unknown,
  client: ImageGenerator = kieClient,
): Promise<KieImageResult> {
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

      span.setAttribute("app.image.result_count", result.urls.length);

      logger.info(
        { operation: "generate_image", result_count: result.urls.length },
        "Image generated",
      );

      return result;
    },
  );
}

export async function editImage(
  input: unknown,
  client: ImageEditor = kieClient,
): Promise<KieImageResult> {
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

      span.setAttribute("app.image.result_count", result.urls.length);

      logger.info(
        { operation: "edit_image", result_count: result.urls.length },
        "Image edited",
      );

      return result;
    },
  );
}
