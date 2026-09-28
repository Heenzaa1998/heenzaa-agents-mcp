import { describe, expect, it } from "vitest";
import {
  generateVideoSchema,
  getTaskStatusSchema,
} from "@/features/video-generation/contracts";

describe("generateVideoSchema", () => {
  it("applies defaults to a text-only prompt", () => {
    expect(generateVideoSchema.parse({ prompt: "  waves at dusk  " })).toEqual({
      prompt: "waves at dusk",
      model: "kling-3.0",
      aspect_ratio: "16:9",
      duration: "5",
      mode: "std",
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

  it("accepts Kling 3.0 elements, an end frame and any length from 3 to 15s", () => {
    const parsed = generateVideoSchema.parse({
      prompt: "@grandma sips tea while @dad sneaks a cookie",
      image_url: "https://example.com/first.png",
      end_image_url: "https://example.com/last.png",
      duration: "4",
      mode: "pro",
      elements: [
        { name: "grandma", description: "calico grandma cat", image_urls: ["https://example.com/g.png", "https://example.com/g-face.png"] },
        { name: "dad", description: "fluffy orange dad cat", image_urls: ["https://example.com/d.png", "https://example.com/d-face.png"] },
      ],
    });

    expect(parsed).toMatchObject({ model: "kling-3.0", duration: "4", mode: "pro" });
    expect(parsed.elements).toHaveLength(2);
  });

  it("keeps kling-2.6 to its own options", () => {
    expect(
      generateVideoSchema.safeParse({ prompt: "x", model: "kling-2.6", duration: "10" }).success,
    ).toBe(true);
  });

  it.each([
    { prompt: "" },
    { prompt: "x".repeat(1001) },
    { prompt: "x", duration: "2" },
    { prompt: "x", duration: "16" },
    { prompt: "x", aspect_ratio: "4:3" },
    { prompt: "x", image_url: "not-a-url" },
    { prompt: "x", end_image_url: "https://example.com/last.png" },
    { prompt: "x", elements: [{ name: "cat", description: "a cat", image_urls: ["https://example.com/c.png", "https://example.com/c-face.png"] }] },
    { prompt: "@Cat", elements: [{ name: "Cat", description: "a cat", image_urls: ["https://example.com/c.png", "https://example.com/c-face.png"] }] },
    {
      prompt: "@a @b @c @d",
      elements: ["a", "b", "c", "d"].map((name) => ({ name, description: name, image_urls: ["https://example.com/x.png", "https://example.com/x-face.png"] })),
    },
    { prompt: "@cat", elements: [{ name: "cat", description: "a cat", image_urls: ["https://example.com/one.png"] }] },
    { prompt: "x", model: "kling-2.6", duration: "7" },
    { prompt: "x", model: "kling-2.6", mode: "pro" },
    { prompt: "@cat", model: "kling-2.6", elements: [{ name: "cat", description: "a cat", image_urls: ["https://example.com/c.png", "https://example.com/c-face.png"] }] },
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
