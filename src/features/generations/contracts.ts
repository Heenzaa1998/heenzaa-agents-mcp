import { z } from "zod";

export const GENERATION_KINDS = ["image", "video"] as const;
export const GENERATION_STATUSES = ["pending", "success", "fail"] as const;

export const storedMediaRefSchema = z.object({
  key: z.string().nullable(),
  url: z.string().optional(),
});

export const newGenerationSchema = z.object({
  kind: z.enum(GENERATION_KINDS),
  operation: z.string().trim().min(1),
  model: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  status: z.enum(GENERATION_STATUSES),
  taskId: z.string().trim().min(1).nullable(),
  media: z.array(storedMediaRefSchema).default([]),
  error: z.string().nullable().default(null),
});

export type NewGenerationInput = z.input<typeof newGenerationSchema>;
export type NewGeneration = z.infer<typeof newGenerationSchema>;

export const generationOutcomeSchema = z.object({
  status: z.enum(["success", "fail"]),
  media: z.array(storedMediaRefSchema).optional(),
  error: z.string().nullable().optional(),
});

export type GenerationOutcome = z.infer<typeof generationOutcomeSchema>;

export const listGenerationsSchema = z.object({
  kind: z
    .enum(GENERATION_KINDS)
    .optional()
    .describe("Only images or only videos."),
  status: z
    .enum(GENERATION_STATUSES)
    .optional()
    .describe("pending = video still being made; fail = generation failed."),
  query: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe("Words to look for in the original prompt."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("How many results to return, newest first."),
});

export type ListGenerationsInput = z.infer<typeof listGenerationsSchema>;
