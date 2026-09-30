import { z } from "zod";
import { MEDIA_KEY_PATTERN } from "@/features/media/contracts";
import { projectNameSchema } from "@/features/projects/contracts";

// Folder-like names such as `sister/main` or `sets/living-room`.
export const REFERENCE_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;

export const REFERENCE_FORMATS = ["png", "jpeg", "webp"] as const;
export const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;

export const referenceNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(
    REFERENCE_NAME_PATTERN,
    "Use lowercase letters, digits, '.', '_' and '-', with '/' between folders, e.g. sister/main.",
  );

export const uploadReferenceSchema = z
  .object({
    name: referenceNameSchema.describe(
      "Name to reuse it by, e.g. sister/main or sets/living-room. Uploading the same name again replaces it.",
    ),
    url: z
      .string()
      .trim()
      .url()
      .startsWith("https://", "Only https URLs are allowed.")
      .optional()
      .describe("Public https URL of the image to copy in."),
    key: z
      .string()
      .trim()
      .regex(MEDIA_KEY_PATTERN, "Unknown media key.")
      .optional()
      .describe("Storage key of a result already saved by this server, e.g. images/<taskId>-1.png."),
    data_base64: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("The image bytes as base64 (PNG, JPEG or WebP, a few MB at most)."),
    project: projectNameSchema.optional().describe("Project this reference belongs to (created if new)."),
  })
  .refine(
    (input) => [input.url, input.key, input.data_base64].filter(Boolean).length === 1,
    "Give exactly one of url, key or data_base64.",
  );

export type UploadReferenceInput = z.infer<typeof uploadReferenceSchema>;

export const listReferencesSchema = z.object({
  project: projectNameSchema.optional().describe("Only references of this project."),
  limit: z.number().int().min(1).max(200).default(50),
});

export type ListReferencesInput = z.infer<typeof listReferencesSchema>;
