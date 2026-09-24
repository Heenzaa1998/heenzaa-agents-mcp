import { z } from "zod";

export const MEDIA_PREFIXES = ["images", "videos"] as const;

export type MediaPrefix = (typeof MEDIA_PREFIXES)[number];

// The server generates keys as `<prefix>/<taskId>-<n>.<ext>`; anything else is
// rejected so callers cannot presign arbitrary objects in the bucket.
export const MEDIA_KEY_PATTERN = /^(images|videos)\/[A-Za-z0-9_-]+\.[a-z0-9]+$/;

export const getMediaUrlSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(MEDIA_KEY_PATTERN, "Unknown media key.")
    .describe(
      "Storage key returned by generate_image or edit_image, e.g. images/<taskId>-1.png.",
    ),
});

export type GetMediaUrlInput = z.infer<typeof getMediaUrlSchema>;
