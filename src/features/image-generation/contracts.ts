import { z } from "zod";

// Allowed values mirror the KIE.ai GPT Image model docs.
export const TEXT_TO_IMAGE_ASPECT_RATIOS = [
  "auto", "1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5",
  "16:9", "9:16", "2:1", "1:2", "3:1", "1:3", "21:9", "9:21",
] as const;
export const RESOLUTIONS = ["1K", "2K", "4K"] as const;
export const BACKGROUNDS = ["transparent", "opaque", "auto"] as const;
export const EDIT_ASPECT_RATIOS = ["1:1", "2:3", "3:2"] as const;
export const QUALITIES = ["medium", "high"] as const;

export const generateImageSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required.")
    .max(20_000, "Prompt must be at most 20000 characters.")
    .describe("Text description of the image to create."),
  aspect_ratio: z
    .enum(TEXT_TO_IMAGE_ASPECT_RATIOS)
    .default("auto")
    .describe("Image aspect ratio."),
  resolution: z
    .enum(RESOLUTIONS)
    .default("1K")
    .describe("Output resolution. 1:1 cannot be 4K."),
  background: z
    .enum(BACKGROUNDS)
    .optional()
    .describe("Background style; use transparent for logos/icons (1K only)."),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export const editImageSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required.")
    .max(20_000, "Prompt must be at most 20000 characters.")
    .describe("How to edit or restyle the input image(s)."),
  image_urls: z
    .array(z.string().url())
    .min(1, "At least one image URL is required.")
    .max(16, "At most 16 image URLs are allowed.")
    .describe(
      "Public https URL(s) of the source image(s). Pass a previous result URL to iterate.",
    ),
  aspect_ratio: z
    .enum(EDIT_ASPECT_RATIOS)
    .default("3:2")
    .describe("Output aspect ratio."),
  quality: z
    .enum(QUALITIES)
    .default("medium")
    .describe("medium is faster; high is slower and more detailed."),
});

export type EditImageInput = z.infer<typeof editImageSchema>;
