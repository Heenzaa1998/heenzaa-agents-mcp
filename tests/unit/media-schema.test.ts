import { describe, expect, it } from "vitest";
import { getMediaUrlSchema } from "@/features/media/contracts";

describe("getMediaUrlSchema", () => {
  it("accepts and trims a generated image key", () => {
    expect(getMediaUrlSchema.parse({ key: " images/abc123-1.png " })).toEqual({
      key: "images/abc123-1.png",
    });
  });

  it.each([
    "abc-1.png",
    "images/../secret.png",
    "docs/abc-1.png",
    "images/abc-1",
    "images/a b-1.png",
  ])("rejects %s", (key) => {
    expect(getMediaUrlSchema.safeParse({ key }).success).toBe(false);
  });
});
