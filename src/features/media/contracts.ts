import { z } from "zod";

export const MEDIA_PREFIXES = ["images", "videos"] as const;

export type MediaPrefix = (typeof MEDIA_PREFIXES)[number];

// Keys are either generated results (`<prefix>/<taskId>-<n>.<ext>`) or named
// references (`refs/<name>.<ext>`); anything else is rejected so callers
// cannot presign arbitrary objects in the bucket.
export const MEDIA_KEY_PATTERN =
  /^(?:(?:images|videos)\/[A-Za-z0-9_-]+|refs\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*)\.[a-z0-9]+$/;

export function isStoredKey(value: string) {
  return MEDIA_KEY_PATTERN.test(value);
}

// Normalizes a tool input for the history: a presigned link to our own
// bucket becomes its storage key, so a take can be matched to the images it
// was made from; anything else is kept as given.
export function toStoredKey(value: string) {
  if (isStoredKey(value)) {
    return value;
  }

  try {
    const match = /\/((?:images|videos|refs)\/[^?]+)$/.exec(new URL(value).pathname);
    const candidate = match ? decodeURIComponent(match[1]!) : null;

    return candidate && isStoredKey(candidate) ? candidate : value;
  } catch {
    return value;
  }
}

// An image input for a tool: a public https URL, or a storage key of a stored
// result / uploaded reference, which the server turns into a link itself.
export const mediaInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => isStoredKey(value) || /^https:\/\/\S+$/.test(value),
    "Give an https URL or a storage key such as refs/sister/main.jpg or images/<taskId>-1.png.",
  );

export const getMediaUrlSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(MEDIA_KEY_PATTERN, "Unknown media key.")
    .describe(
      "Storage key of a result (images/<taskId>-1.png, videos/...) or an uploaded reference (refs/<name>.<ext>).",
    ),
});

export type GetMediaUrlInput = z.infer<typeof getMediaUrlSchema>;
