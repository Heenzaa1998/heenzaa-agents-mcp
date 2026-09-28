import { z } from "zod";

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required.")
  .max(80, "Project name must be at most 80 characters.");

export const shotLabelSchema = z
  .string()
  .trim()
  .min(1, "Shot label is required.")
  .max(60, "Shot label must be at most 60 characters.");

// Optional tags any generation tool accepts, so work can be grouped from chat.
export const workTagShape = {
  project: projectNameSchema
    .optional()
    .describe("Project (the longer piece this belongs to), e.g. 'Rainy Tokyo short'. Created if new."),
  shot: shotLabelSchema
    .optional()
    .describe("Shot inside the project, e.g. 'shot 3'. Regenerating the same shot adds another take."),
};

// Default = $0.005 per credit × 33 THB per USD.
export const DEFAULT_CREDIT_RATE_THB = 0.165;
export const CREDIT_RATE_SETTING = "credit_rate_thb";

export const creditRateSchema = z.object({
  rate: z.coerce
    .number()
    .positive("The rate must be above zero.")
    .max(100, "That rate looks too high."),
});

const optionalText = (schema: z.ZodString) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );

export const assignGenerationSchema = z.object({
  generationId: z.coerce.number().int().positive(),
  project: optionalText(projectNameSchema),
  shot: optionalText(shotLabelSchema),
});

export type AssignGenerationInput = z.infer<typeof assignGenerationSchema>;

export const selectTakeSchema = z.object({
  generationId: z.coerce.number().int().positive(),
});

export const getCostsSchema = z.object({
  project: projectNameSchema.optional().describe("Limit the report to one project."),
});
