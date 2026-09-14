import { z } from "zod";

export const createSubscriberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(64, "Name must be at most 64 characters."),
  email: z
    .string()
    .trim()
    .email("Use a valid email address.")
    .transform((value) => value.toLowerCase()),
});

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;
