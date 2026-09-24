import { describe, expect, it } from "vitest";
import {
  generateVideoSchema,
  getTaskStatusSchema,
} from "@/features/video-generation/contracts";

describe("generateVideoSchema", () => {
  it("applies defaults to a text-only prompt", () => {
    expect(generateVideoSchema.parse({ prompt: "  waves at dusk  " })).toEqual({
      prompt: "waves at dusk",
      aspect_ratio: "16:9",
      duration: "5",
      sound: false,
    });
  });

  it("accepts an image to animate", () => {
    const parsed = generateVideoSchema.parse({
      prompt: "the cat turns its head",
      image_url: "https://example.com/cat.png",
      duration: "10",
    });

    expect(parsed.image_url).toBe("https://example.com/cat.png");
    expect(parsed.duration).toBe("10");
  });

  it.each([
    { prompt: "" },
    { prompt: "x".repeat(1001) },
    { prompt: "x", duration: "7" },
    { prompt: "x", aspect_ratio: "4:3" },
    { prompt: "x", image_url: "not-a-url" },
  ])("rejects %o", (input) => {
    expect(generateVideoSchema.safeParse(input).success).toBe(false);
  });
});

describe("getTaskStatusSchema", () => {
  it("accepts a KIE task id", () => {
    expect(getTaskStatusSchema.parse({ task_id: " abc123_DEF-9 " })).toEqual({
      task_id: "abc123_DEF-9",
    });
  });

  it.each(["", "../x", "a b", "x".repeat(129)])("rejects %s", (taskId) => {
    expect(getTaskStatusSchema.safeParse({ task_id: taskId }).success).toBe(false);
  });
});
