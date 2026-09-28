// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { makeThumbnail, THUMBNAIL_WIDTH, thumbnailKeyFor } from "@/server/storage/thumbnail";

describe("thumbnailKeyFor", () => {
  it("maps an image key to a WebP key under thumbs/", () => {
    expect(thumbnailKeyFor("images/abc123-1.png")).toBe("thumbs/abc123-1.webp");
    expect(thumbnailKeyFor("images/abc123-2.jpeg")).toBe("thumbs/abc123-2.webp");
  });
});

describe("makeThumbnail", () => {
  it("shrinks a large image to a small WebP", async () => {
    const original = await sharp({
      create: { width: 2000, height: 1500, channels: 3, background: "#4af" },
    })
      .png()
      .toBuffer();

    const thumb = await makeThumbnail(new Uint8Array(original));
    const meta = await sharp(thumb).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(THUMBNAIL_WIDTH);
    expect(meta.height).toBe(540);
  });

  it("does not enlarge a small image", async () => {
    const small = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#000" },
    })
      .png()
      .toBuffer();

    expect((await sharp(await makeThumbnail(new Uint8Array(small))).metadata()).width).toBe(300);
  });

  it("rejects bytes that are not an image", async () => {
    await expect(makeThumbnail(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });
});
