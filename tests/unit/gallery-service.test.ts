import { describe, expect, it, vi } from "vitest";
import {
  GALLERY_LINK_TTL_SECONDS,
  GALLERY_PAGE_SIZE,
  galleryFiltersFrom,
  listGalleryItems,
} from "@/features/gallery/service";
import type { MediaStore } from "@/server/storage/r2";

function makeStore(overrides: Partial<MediaStore> = {}): MediaStore {
  return {
    enabled: true,
    put: vi.fn(),
    exists: vi.fn(),
    presign: vi
      .fn()
      .mockImplementation(async (key: string) => `https://r2.example/${key}?sig=1`),
    ...overrides,
  };
}

const record = {
  id: 7,
  kind: "image" as const,
  operation: "generate_image",
  model: "gpt-image-2-text-to-image",
  prompt: "a cat",
  status: "success" as const,
  taskId: "task_7",
  media: [{ key: "images/task_7-1.png" }, { key: null, url: "https://kie.example/b.png" }],
  error: null,
  createdAt: "2026-09-28 01:02:03.000000+00",
  updatedAt: "2026-09-28 01:02:03.000000+00",
};

describe("galleryFiltersFrom", () => {
  it("keeps valid filters and trims the query", () => {
    expect(
      galleryFiltersFrom({ kind: "video", status: "pending", q: "  sunset  " }),
    ).toEqual({ kind: "video", status: "pending", query: "sunset" });
  });

  it("drops invalid or empty values instead of failing", () => {
    expect(galleryFiltersFrom({ kind: "audio", status: ["nope"], q: "   " })).toEqual({
      kind: undefined,
      status: undefined,
      query: undefined,
    });
  });
});

describe("listGalleryItems", () => {
  it("presigns stored files and keeps provider links for unstored ones", async () => {
    const list = vi.fn().mockResolvedValue([record]);
    const store = makeStore();

    const items = await listGalleryItems({ kind: "image" }, list, store);

    expect(list).toHaveBeenCalledWith({ kind: "image", limit: GALLERY_PAGE_SIZE });
    expect(store.presign).toHaveBeenCalledWith(
      "images/task_7-1.png",
      GALLERY_LINK_TTL_SECONDS,
    );
    expect(items[0]?.media).toEqual([
      { key: "images/task_7-1.png", url: "https://r2.example/images/task_7-1.png?sig=1" },
      { key: null, url: "https://kie.example/b.png" },
    ]);
    expect(items[0]).not.toHaveProperty("operation");
  });

  it("has no link for stored files when storage is off", async () => {
    const list = vi.fn().mockResolvedValue([record]);

    const items = await listGalleryItems({}, list, makeStore({ enabled: false }));

    expect(items[0]?.media[0]).toEqual({ key: "images/task_7-1.png", url: null });
  });
});
