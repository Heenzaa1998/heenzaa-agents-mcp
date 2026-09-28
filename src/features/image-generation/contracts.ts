import { z } from "zod";
import { workTagShape } from "@/features/projects/contracts";

// Allowed values mirror the KIE.ai GPT Image model docs.
export const ASPECT_RATIOS = [
  "auto", "1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5",
  "16:9", "9:16", "2:1", "1:2", "3:1", "1:3", "21:9", "9:21",
] as const;
export const RESOLUTIONS = ["1K", "2K", "4K"] as const;
export const BACKGROUNDS = ["transparent", "opaque", "auto"] as const;
export const EDIT_MODELS = ["gpt-image-2", "gpt-image-1.5"] as const;
// gpt-image-1.5 image-to-image only supports these.
export const LEGACY_EDIT_ASPECT_RATIOS = ["1:1", "2:3", "3:2"] as const;
export const QUALITIES = ["medium", "high"] as const;

// Ratios KIE rejects at 2K and 4K.
const STANDARD_ONLY_RATIOS = new Set(["5:4", "4:5", "3:1", "1:3", "9:21"]);

type ImageOptions = {
  aspect_ratio: string;
  resolution: string;
  background?: string;
};

// KIE's GPT Image 2 rules, checked up front so callers get a clear error
// instead of a failed task.
function checkImageOptions(options: ImageOptions, ctx: z.RefinementCtx) {
  const { aspect_ratio: ratio, resolution, background } = options;

  if (ratio === "auto" && resolution !== "1K") {
    ctx.addIssue({
      code: "custom",
      path: ["aspect_ratio"],
      message: "aspect_ratio auto only works with resolution 1K; pick a ratio such as 9:16.",
    });
  }

  if (resolution !== "1K" && STANDARD_ONLY_RATIOS.has(ratio)) {
    ctx.addIssue({
      code: "custom",
      path: ["resolution"],
      message: `aspect_ratio ${ratio} only works with resolution 1K.`,
    });
  }

  if (ratio === "1:1" && resolution === "4K") {
    ctx.addIssue({
      code: "custom",
      path: ["resolution"],
      message: "aspect_ratio 1:1 cannot be 4K; use 2K.",
    });
  }

  if (background && resolution !== "1K") {
    ctx.addIssue({
      code: "custom",
      path: ["background"],
      message: "background only works with resolution 1K.",
    });
  }
}

const promptField = (description: string) =>
  z
    .string()
    .trim()
    .min(1, "Prompt is required.")
    .max(20_000, "Prompt must be at most 20000 characters.")
    .describe(description);

export const generateImageSchema = z
  .object({
    prompt: promptField("Text description of the image to create."),
    aspect_ratio: z
      .enum(ASPECT_RATIOS)
      .default("auto")
      .describe("Image aspect ratio. Use 9:16 for vertical video frames."),
    resolution: z
      .enum(RESOLUTIONS)
      .default("1K")
      .describe(
        "Output resolution. auto ratio is 1K only; 1:1 cannot be 4K; 5:4, 4:5, 3:1, 1:3, 9:21 are 1K only.",
      ),
    background: z
      .enum(BACKGROUNDS)
      .optional()
      .describe("Background style; use transparent for logos/icons (1K only)."),
    ...workTagShape,
  })
  .superRefine(checkImageOptions);

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export const editImageSchema = z
  .object({
    prompt: promptField("How to edit or restyle the input image(s)."),
    image_urls: z
      .array(z.string().url())
      .min(1, "At least one image URL is required.")
      .max(16, "At most 16 image URLs are allowed.")
      .describe(
        "Public https URL(s) of the source/reference image(s), e.g. a character sheet plus a background. Pass a previous result URL to iterate.",
      ),
    model: z
      .enum(EDIT_MODELS)
      .default("gpt-image-2")
      .describe(
        "gpt-image-2 (default) supports every aspect ratio and 1K/2K/4K. gpt-image-1.5 is the older model: only 1:1, 2:3, 3:2 and uses quality.",
      ),
    aspect_ratio: z
      .enum(ASPECT_RATIOS)
      .default("auto")
      .describe(
        "Output aspect ratio. Use 9:16 for vertical video frames. gpt-image-1.5 only accepts 1:1, 2:3, 3:2 (auto becomes 3:2).",
      ),
    resolution: z
      .enum(RESOLUTIONS)
      .default("1K")
      .describe(
        "Output resolution (gpt-image-2 only). auto ratio is 1K only; 1:1 cannot be 4K; 5:4, 4:5, 3:1, 1:3, 9:21 are 1K only.",
      ),
    background: z
      .enum(BACKGROUNDS)
      .optional()
      .describe("Background style (gpt-image-2 only, 1K only)."),
    quality: z
      .enum(QUALITIES)
      .optional()
      .describe("gpt-image-1.5 only: medium (default) is faster; high is slower and more detailed."),
    ...workTagShape,
  })
  .superRefine((input, ctx) => {
    if (input.model === "gpt-image-2") {
      checkImageOptions(input, ctx);
      return;
    }

    if (
      input.aspect_ratio !== "auto" &&
      !(LEGACY_EDIT_ASPECT_RATIOS as readonly string[]).includes(input.aspect_ratio)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["aspect_ratio"],
        message: "gpt-image-1.5 only supports 1:1, 2:3 and 3:2; use model gpt-image-2 for other ratios.",
      });
    }

    if (input.background) {
      ctx.addIssue({
        code: "custom",
        path: ["background"],
        message: "background needs model gpt-image-2.",
      });
    }
  });

export type EditImageInput = z.infer<typeof editImageSchema>;
