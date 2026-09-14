import { describe, expect, it } from "vitest";
import {
  editImageSchema,
  generateImageSchema,
} from "@/features/image-generation/contracts";

describe("generateImageSchema", () => {
  it("trims the prompt and applies defaults", () => {
    const parsed = generateImageSchema.parse({ prompt: "  a red fox  " });

    expect(parsed).toMatchObject({
      prompt: "a red fox",
      aspect_ratio: "auto",
      resolution: "1K",
    });
  });

  it("rejects an empty prompt", () => {
    expect(generateImageSchema.safeParse({ prompt: "   " }).success).toBe(false);
  });

  it("rejects an unknown aspect ratio", () => {
    expect(
      generateImageSchema.safeParse({ prompt: "x", aspect_ratio: "7:7" }).success,
    ).toBe(false);
  });
});

describe("editImageSchema", () => {
  it("accepts image URLs and defaults aspect ratio and quality", () => {
    const parsed = editImageSchema.parse({
      prompt: "make it night",
      image_urls: ["https://example.com/a.png"],
    });

    expect(parsed).toMatchObject({ aspect_ratio: "3:2", quality: "medium" });
    expect(parsed.image_urls).toHaveLength(1);
  });

  it("rejects a non-url input", () => {
    expect(
      editImageSchema.safeParse({ prompt: "x", image_urls: ["not-a-url"] })
        .success,
    ).toBe(false);
  });

  it("rejects an empty image list", () => {
    expect(
      editImageSchema.safeParse({ prompt: "x", image_urls: [] }).success,
    ).toBe(false);
  });
});
