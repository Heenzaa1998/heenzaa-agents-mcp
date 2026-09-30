import { z } from "zod";
import { mediaInputSchema } from "@/features/media/contracts";
import { workTagShape } from "@/features/projects/contracts";

// Allowed values mirror the KIE.ai Kling 2.6 and 3.0 model docs.
export const VIDEO_MODELS = ["kling-3.0", "kling-2.6"] as const;
export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;
// Kling 3.0 takes any whole second from 3 to 15; Kling 2.6 only 5 or 10.
export const VIDEO_DURATIONS = [
  "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
] as const;
export const LEGACY_VIDEO_DURATIONS = ["5", "10"] as const;
export const VIDEO_MODES = ["std", "pro", "4K"] as const;

const elementSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,31}$/, "Use lowercase letters, digits and _ (e.g. grandma).")
    .describe("Handle used in the prompt as @name."),
  description: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Short description of the character or object."),
  image_urls: z
    .array(mediaInputSchema)
    .min(2, "Kling 3.0 needs 2 to 4 reference images per element.")
    .max(4, "Kling 3.0 needs 2 to 4 reference images per element.")
    .describe(
      "2–4 reference images of this element (https URLs or storage keys), each no wider or taller than 2.5:1 (e.g. front view, three-quarter view, face close-up cut from a character sheet).",
    ),
});

export const generateVideoSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, "Prompt is required.")
      .max(1000, "Prompt must be at most 1000 characters.")
      .describe("Description of the scene and motion. With elements, refer to them as @name."),
    model: z
      .enum(VIDEO_MODELS)
      .default("kling-3.0")
      .describe(
        "kling-3.0 (default): better character consistency and prompt following, 3–15s, elements, end frame. kling-2.6: cheaper per clip, 5 or 10s only.",
      ),
    image_url: mediaInputSchema
      .optional()
      .describe(
        "Optional first frame to animate (JPEG/PNG, max 10MB): an https URL or a storage key such as images/<taskId>-1.png or refs/<name>.<ext>. The clip takes the image's aspect ratio.",
      ),
    end_image_url: mediaInputSchema
      .optional()
      .describe("kling-3.0 only: optional last frame (URL or storage key); needs image_url."),
    aspect_ratio: z
      .enum(VIDEO_ASPECT_RATIOS)
      .default("16:9")
      .describe("Aspect ratio for text-to-video; ignored when image_url is set."),
    duration: z
      .enum(VIDEO_DURATIONS)
      .default("5")
      .describe("Clip length in seconds: 3–15 on kling-3.0, 5 or 10 on kling-2.6. Cost scales with length."),
    mode: z
      .enum(VIDEO_MODES)
      .default("std")
      .describe("kling-3.0 only: std (720p, cheapest), pro (1080p) or 4K."),
    elements: z
      .array(elementSchema)
      .max(3, "At most 3 elements.")
      .optional()
      .describe(
        "kling-3.0 only: up to 3 characters/objects bound to reference images so they stay consistent. Mention each as @name in the prompt.",
      ),
    sound: z
      .boolean()
      .default(false)
      .describe("Also generate audio. Costs more credits."),
    ...workTagShape,
  })
  .superRefine((input, ctx) => {
    if (input.end_image_url && !input.image_url) {
      ctx.addIssue({
        code: "custom",
        path: ["end_image_url"],
        message: "end_image_url needs image_url (the first frame).",
      });
    }

    if (input.model === "kling-3.0") {
      for (const element of input.elements ?? []) {
        if (!input.prompt.includes(`@${element.name}`)) {
          ctx.addIssue({
            code: "custom",
            path: ["elements"],
            message: `Mention element ${element.name} in the prompt as @${element.name}.`,
          });
        }
      }
      return;
    }

    if (!(LEGACY_VIDEO_DURATIONS as readonly string[]).includes(input.duration)) {
      ctx.addIssue({
        code: "custom",
        path: ["duration"],
        message: "kling-2.6 only supports 5 or 10 seconds; use model kling-3.0 for other lengths.",
      });
    }

    for (const field of ["end_image_url", "elements"] as const) {
      if (input[field] !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${field} needs model kling-3.0.`,
        });
      }
    }

    if (input.mode !== "std") {
      ctx.addIssue({
        code: "custom",
        path: ["mode"],
        message: "mode needs model kling-3.0.",
      });
    }
  });

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;

// Kling AI Avatar: the mouth follows a given audio file, so dubbed lines keep
// their own voice.
export const TALKING_VIDEO_MODES = ["standard", "pro"] as const;

export const generateTalkingVideoSchema = z.object({
  image_url: mediaInputSchema.describe(
    "The character to animate (JPEG/PNG, max 10MB): an https URL or a storage key such as images/<taskId>-1.png or refs/<name>.<ext>.",
  ),
  audio_url: mediaInputSchema.describe(
    "The speech to lip-sync (MP3/WAV/AAC/OGG, max 5 minutes): an https URL or a storage key such as refs/<name>.mp3. The clip is as long as the audio.",
  ),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required.")
    .max(5000, "Prompt must be at most 5000 characters.")
    .describe("Expression, gestures and camera; the words come from the audio."),
  mode: z
    .enum(TALKING_VIDEO_MODES)
    .default("standard")
    .describe("standard (720p, cheaper) or pro (1080p)."),
  ...workTagShape,
});

export type GenerateTalkingVideoInput = z.infer<typeof generateTalkingVideoSchema>;

export const getTaskStatusSchema = z.object({
  task_id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid task id.")
    .describe("task_id returned by generate_video."),
});

export type GetTaskStatusInput = z.infer<typeof getTaskStatusSchema>;
