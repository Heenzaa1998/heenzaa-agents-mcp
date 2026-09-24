import { describe, expect, it } from "vitest";
import {
  listGenerationsSchema,
  newGenerationSchema,
} from "@/features/generations/contracts";

describe("newGenerationSchema", () => {
  it("trims the prompt and defaults media and error", () => {
    const parsed = newGenerationSchema.parse({
      kind: "image",
      operation: "generate_image",
      model: "gpt-image-2-text-to-image",
      prompt: "  a red fox  ",
      status: "success",
      taskId: "task_1",
    });

    expect(parsed).toMatchObject({ prompt: "a red fox", media: [], error: null });
  });

  it.each([
    { kind: "audio" },
    { status: "done" },
    { prompt: "   " },
    { taskId: "" },
  ])("rejects %o", (override) => {
    const result = newGenerationSchema.safeParse({
      kind: "image",
      operation: "generate_image",
      model: "m",
      prompt: "p",
      status: "success",
      taskId: null,
      ...override,
    });

    expect(result.success).toBe(false);
  });
});

describe("listGenerationsSchema", () => {
  it("defaults the limit and trims the query", () => {
    expect(listGenerationsSchema.parse({ query: "  cat  " })).toEqual({
      query: "cat",
      limit: 10,
    });
  });

  it.each([{ limit: 0 }, { limit: 51 }, { kind: "audio" }, { query: "" }])(
    "rejects %o",
    (input) => {
      expect(listGenerationsSchema.safeParse(input).success).toBe(false);
    },
  );
});
