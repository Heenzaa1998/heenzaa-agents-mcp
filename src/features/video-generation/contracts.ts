import { z } from "zod";

// Allowed values mirror the KIE.ai Kling 2.6 model docs.
export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;
export const VIDEO_DURATIONS = ["5", "10"] as const;

export const generateVideoSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required.")
    .max(1000, "Prompt must be at most 1000 characters.")
    .describe("Description of the scene and motion."),
  image_url: z
    .string()
    .url()
    .optional()
    .describe(
      "Optional image to animate (JPEG/PNG, max 10MB). A link returned by generate_image works. The clip takes the image's aspect ratio.",
    ),
  aspect_ratio: z
    .enum(VIDEO_ASPECT_RATIOS)
    .default("16:9")
    .describe("Aspect ratio for text-to-video; ignored when image_url is set."),
  duration: z
    .enum(VIDEO_DURATIONS)
    .default("5")
    .describe("Clip length in seconds."),
  sound: z
    .boolean()
    .default(false)
    .describe("Also generate audio. Costs more credits."),
});

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;

export const getTaskStatusSchema = z.object({
  task_id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid task id.")
    .describe("task_id returned by generate_video."),
});

export type GetTaskStatusInput = z.infer<typeof getTaskStatusSchema>;
