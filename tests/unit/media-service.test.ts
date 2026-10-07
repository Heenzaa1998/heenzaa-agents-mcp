import { describe, expect, it, vi } from "vitest";
import {
  buildMediaKey,
  getMediaUrl,
  persistRemoteMedia,
} from "@/features/media/service";
import type { MediaStore } from "@/server/storage/r2";

function makeStore(overrides: Partial<MediaStore> = {}): MediaStore {
  return {
    enabled: true,
    put: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    presign: vi
      .fn()
      .mockImplementation(async (key: string) => `https://r2.example/${key}?sig=1`),
    ...overrides,
  };
}

// ftyp + moov > mvhd (version 0), the smallest file the MP4 reader accepts.
function tinyMp4(timescale: number, duration: number) {
  const bytes = new Uint8Array(20 + 116);
  const view = new DataView(bytes.buffer);
  const tag = (offset: number, type: string) => bytes.set(new TextEncoder().encode(type), offset);

  view.setUint32(0, 20);
  tag(4, "ftyp");
  tag(8, "isomiso2mp41");
  view.setUint32(20, 116);
  tag(24, "moov");
  view.setUint32(28, 108);
  tag(32, "mvhd");
  view.setUint32(36 + 12, timescale);
  view.setUint32(36 + 16, duration);

  return bytes;
}

describe("persistRemoteMedia", () => {
  it("returns provider URLs untouched when storage is disabled", async () => {
    const store = makeStore({ enabled: false });
    const fetchFn = vi.fn();

    const items = await persistRemoteMedia(
      ["https://kie.example/a.png"],
      { prefix: "images", taskId: "t1" },
      store,
      fetchFn,
    );

    expect(items).toEqual([
      { url: "https://kie.example/a.png", key: null, expiresInSeconds: null },
    ]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("downloads, uploads and presigns a new file", async () => {
    const store = makeStore();
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    const items = await persistRemoteMedia(
      ["https://kie.example/file.PNG"],
      { prefix: "images", taskId: "task_9" },
      store,
      fetchFn,
    );

    expect(store.put).toHaveBeenCalledWith(
      "images/task_9-1.png",
      expect.anything(),
      "image/png",
    );
    expect(items).toEqual([
      {
        url: "https://r2.example/images/task_9-1.png?sig=1",
        key: "images/task_9-1.png",
        expiresInSeconds: 604800,
      },
    ]);
  });

  it("stores a thumbnail next to a new image", async () => {
    const store = makeStore();
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const thumbnailer = vi.fn().mockResolvedValue(new Uint8Array([9]));

    const items = await persistRemoteMedia(
      ["https://kie.example/file.png"],
      { prefix: "images", taskId: "task_9" },
      store,
      fetchFn,
      thumbnailer,
    );

    expect(store.put).toHaveBeenCalledWith("thumbs/task_9-1.webp", expect.anything(), "image/webp");
    expect(items[0]?.thumbKey).toBe("thumbs/task_9-1.webp");
  });

  it("still stores the image when the thumbnail fails", async () => {
    const store = makeStore();
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const thumbnailer = vi.fn().mockRejectedValue(new Error("bad image"));

    const items = await persistRemoteMedia(
      ["https://kie.example/file.png"],
      { prefix: "images", taskId: "task_9" },
      store,
      fetchFn,
      thumbnailer,
    );

    expect(items[0]).toMatchObject({ key: "images/task_9-1.png" });
    expect(items[0]?.thumbKey).toBeUndefined();
  });

  it("does not make thumbnails for videos", async () => {
    const store = makeStore();
    const fetchFn = vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    const thumbnailer = vi.fn();

    await persistRemoteMedia(
      ["https://kie.example/clip.mp4"],
      { prefix: "videos", taskId: "vid_1" },
      store,
      fetchFn,
      thumbnailer,
    );

    expect(thumbnailer).not.toHaveBeenCalled();
  });

  it("reads the length of a new video from its MP4 header", async () => {
    const store = makeStore();
    const fetchFn = vi.fn().mockResolvedValue(new Response(tinyMp4(1000, 4600), { status: 200 }));

    const items = await persistRemoteMedia(
      ["https://kie.example/clip.mp4"],
      { prefix: "videos", taskId: "ava_1" },
      store,
      fetchFn,
    );

    expect(store.put).toHaveBeenCalledWith("videos/ava_1-1.mp4", expect.anything(), "video/mp4");
    expect(items[0]).toMatchObject({ key: "videos/ava_1-1.mp4", durationSeconds: 4.6 });
  });

  it("leaves the length out when the video header cannot be read", async () => {
    const store = makeStore();
    const fetchFn = vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));

    const items = await persistRemoteMedia(
      ["https://kie.example/clip.mp4"],
      { prefix: "videos", taskId: "vid_1" },
      store,
      fetchFn,
    );

    expect(items[0]?.key).toBe("videos/vid_1-1.mp4");
    expect(items[0]).not.toHaveProperty("durationSeconds");
  });

  it("skips the upload when the object already exists", async () => {
    const store = makeStore({ exists: vi.fn().mockResolvedValue(true) });
    const fetchFn = vi.fn();

    const items = await persistRemoteMedia(
      ["https://kie.example/file.png"],
      { prefix: "images", taskId: "task_9" },
      store,
      fetchFn,
    );

    expect(fetchFn).not.toHaveBeenCalled();
    expect(store.put).not.toHaveBeenCalled();
    expect(items[0]?.key).toBe("images/task_9-1.png");
  });

  it("falls back to the provider URL when the download fails", async () => {
    const store = makeStore();
    const fetchFn = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));

    const items = await persistRemoteMedia(
      ["https://kie.example/a.png"],
      { prefix: "images", taskId: "t1" },
      store,
      fetchFn,
    );

    expect(items).toEqual([
      { url: "https://kie.example/a.png", key: null, expiresInSeconds: null },
    ]);
    expect(store.put).not.toHaveBeenCalled();
  });
});

describe("buildMediaKey", () => {
  it("strips unsafe characters from the task id", () => {
    expect(buildMediaKey("videos", "task/../x y", 1, ".mp4")).toBe(
      "videos/taskxy-2.mp4",
    );
  });
});

describe("getMediaUrl", () => {
  it("returns a fresh presigned link for a stored key", async () => {
    const store = makeStore({ exists: vi.fn().mockResolvedValue(true) });

    const item = await getMediaUrl({ key: "images/task_9-1.png" }, store);

    expect(item).toEqual({
      url: "https://r2.example/images/task_9-1.png?sig=1",
      key: "images/task_9-1.png",
      expiresInSeconds: 604800,
    });
  });

  it("rejects a key that is not in storage", async () => {
    const store = makeStore({ exists: vi.fn().mockResolvedValue(false) });

    await expect(
      getMediaUrl({ key: "images/missing-1.png" }, store),
    ).rejects.toMatchObject({ code: "media_not_found", statusCode: 404 });
  });

  it("reports storage_not_configured when storage is disabled", async () => {
    await expect(
      getMediaUrl({ key: "images/x-1.png" }, makeStore({ enabled: false })),
    ).rejects.toMatchObject({ code: "storage_not_configured", statusCode: 503 });
  });
});
