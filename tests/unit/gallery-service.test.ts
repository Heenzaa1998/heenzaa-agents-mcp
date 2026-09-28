import { describe, expect, it, vi } from "vitest";
import {
  backfillThumbnails,
  GALLERY_LINK_TTL_SECONDS,
  GALLERY_PAGE_SIZE,
  galleryFiltersFrom,
  listGalleryItems,
} from "@/features/gallery/service";
import type { GenerationRecord } from "@/server/db/schema";
import type { MediaStore } from "@/server/storage/r2";

function makeStore(overrides: Partial<MediaStore> = {}): MediaStore {
  return {
    enabled: true,
    put: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn(),
    presign: vi
      .fn()
      .mockImplementation(async (key: string) => `https://r2.example/${key}?sig=1`),
    ...overrides,
  };
}

const record: GenerationRecord = {
  id: 7,
  kind: "image",
  operation: "generate_image",
  model: "gpt-image-2-text-to-image",
  prompt: "a cat",
  status: "success",
  taskId: "task_7",
  media: [
    { key: "images/task_7-1.png", thumbKey: "thumbs/task_7-1.webp" },
    { key: null, url: "https://kie.example/b.png" },
  ],
  error: null,
  credits: 6,
  durationSeconds: null,
  projectId: null,
  shot: null,
  selected: false,
  createdAt: "2026-09-28 01:02:03.000000+00",
  updatedAt: "2026-09-28 01:02:03.000000+00",
};

const withoutThumb: GenerationRecord = {
  ...record,
  id: 8,
  media: [{ key: "images/task_8-1.png" }],
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
  it("presigns the original and its thumbnail, and keeps provider links", async () => {
    const list = vi.fn().mockResolvedValue([record]);
    const store = makeStore();

    const { items, needsThumbnails } = await listGalleryItems({ kind: "image" }, list, store);

    expect(list).toHaveBeenCalledWith({ kind: "image", limit: GALLERY_PAGE_SIZE });
    expect(store.presign).toHaveBeenCalledWith("images/task_7-1.png", GALLERY_LINK_TTL_SECONDS);
    expect(items[0]?.media).toEqual([
      {
        key: "images/task_7-1.png",
        url: "https://r2.example/images/task_7-1.png?sig=1",
        thumbUrl: "https://r2.example/thumbs/task_7-1.webp?sig=1",
      },
      { key: null, url: "https://kie.example/b.png", thumbUrl: null },
    ]);
    expect(needsThumbnails).toEqual([]);
    expect(items[0]).not.toHaveProperty("operation");
  });

  it("flags stored images that have no thumbnail yet", async () => {
    const list = vi.fn().mockResolvedValue([record, withoutThumb]);

    const { items, needsThumbnails } = await listGalleryItems({}, list, makeStore());

    expect(items[1]?.media[0]?.thumbUrl).toBeNull();
    expect(needsThumbnails.map((r) => r.id)).toEqual([8]);
  });

  it("has no links and nothing to backfill when storage is off", async () => {
    const list = vi.fn().mockResolvedValue([withoutThumb]);

    const page = await listGalleryItems({}, list, makeStore({ enabled: false }));

    expect(page.items[0]?.media[0]).toEqual({
      key: "images/task_8-1.png",
      url: null,
      thumbUrl: null,
    });
    expect(page.needsThumbnails).toEqual([]);
  });
});

describe("backfillThumbnails", () => {
  it("creates the missing preview from the original and saves its key", async () => {
    const store = makeStore();
    const repository = { updateMedia: vi.fn().mockResolvedValue(undefined) };
    const fetchFn = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    const thumbnailer = vi.fn().mockResolvedValue(new Uint8Array([9]));

    const created = await backfillThumbnails(
      [withoutThumb],
      store,
      repository,
      fetchFn,
      thumbnailer,
    );

    expect(created).toBe(1);
    expect(fetchFn).toHaveBeenCalledWith("https://r2.example/images/task_8-1.png?sig=1");
    expect(store.put).toHaveBeenCalledWith("thumbs/task_8-1.webp", expect.anything(), "image/webp");
    expect(repository.updateMedia).toHaveBeenCalledWith(8, [
      { key: "images/task_8-1.png", thumbKey: "thumbs/task_8-1.webp" },
    ]);
  });

  it("leaves the record alone when the preview fails", async () => {
    const repository = { updateMedia: vi.fn() };
    const fetchFn = vi.fn().mockResolvedValue(new Response(new Uint8Array([1])));
    const thumbnailer = vi.fn().mockRejectedValue(new Error("not an image"));

    const created = await backfillThumbnails(
      [withoutThumb],
      makeStore(),
      repository,
      fetchFn,
      thumbnailer,
    );

    expect(created).toBe(0);
    expect(repository.updateMedia).not.toHaveBeenCalled();
  });

  it("does nothing when storage is off", async () => {
    const repository = { updateMedia: vi.fn() };

    expect(
      await backfillThumbnails([withoutThumb], makeStore({ enabled: false }), repository),
    ).toBe(0);
    expect(repository.updateMedia).not.toHaveBeenCalled();
  });
});
