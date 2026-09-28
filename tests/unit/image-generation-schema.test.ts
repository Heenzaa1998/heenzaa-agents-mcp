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

  it.each([
    [{ aspect_ratio: "auto", resolution: "2K" }, "aspect_ratio"],
    [{ aspect_ratio: "4:5", resolution: "2K" }, "resolution"],
    [{ aspect_ratio: "1:1", resolution: "4K" }, "resolution"],
    [{ aspect_ratio: "9:16", resolution: "2K", background: "transparent" }, "background"],
  ])("rejects KIE-incompatible options %o", (options, path) => {
    const result = generateImageSchema.safeParse({ prompt: "x", ...options });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([path]);
  });

  it("accepts a vertical 4K frame", () => {
    expect(
      generateImageSchema.safeParse({ prompt: "x", aspect_ratio: "9:16", resolution: "4K" })
        .success,
    ).toBe(true);
  });
});

describe("editImageSchema", () => {
  it("defaults to gpt-image-2 with auto ratio at 1K", () => {
    const parsed = editImageSchema.parse({
      prompt: "make it night",
      image_urls: ["https://example.com/a.png"],
    });

    expect(parsed).toMatchObject({ model: "gpt-image-2", aspect_ratio: "auto", resolution: "1K" });
    expect(parsed.image_urls).toHaveLength(1);
  });

  it("accepts a vertical 9:16 edit on gpt-image-2", () => {
    expect(
      editImageSchema.safeParse({
        prompt: "x",
        image_urls: ["https://example.com/a.png"],
        aspect_ratio: "9:16",
        resolution: "2K",
      }).success,
    ).toBe(true);
  });

  it("applies the KIE rules to gpt-image-2 edits", () => {
    expect(
      editImageSchema.safeParse({
        prompt: "x",
        image_urls: ["https://example.com/a.png"],
        resolution: "2K",
      }).success,
    ).toBe(false);
  });

  it("limits gpt-image-1.5 to its own ratios and no background", () => {
    const base = { prompt: "x", image_urls: ["https://example.com/a.png"], model: "gpt-image-1.5" };

    expect(editImageSchema.safeParse({ ...base, aspect_ratio: "2:3", quality: "high" }).success).toBe(true);
    expect(editImageSchema.safeParse({ ...base, aspect_ratio: "9:16" }).success).toBe(false);
    expect(editImageSchema.safeParse({ ...base, background: "transparent" }).success).toBe(false);
  });

  it("still accepts quality from older clients", () => {
    expect(
      editImageSchema.safeParse({
        prompt: "x",
        image_urls: ["https://example.com/a.png"],
        quality: "high",
      }).success,
    ).toBe(true);
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
