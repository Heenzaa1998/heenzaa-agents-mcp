import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { isStoredKey, mediaInputSchema } from "@/features/media/contracts";
import { resolveMediaInputs } from "@/features/media/service";
import { uploadReferenceSchema } from "@/features/references/contracts";
import type { NewReferenceImage, ReferenceRepository } from "@/features/references/repository";
import { listReferences, uploadReference } from "@/features/references/service";

let png: Buffer;

beforeAll(async () => {
  png = await sharp({ create: { width: 8, height: 6, channels: 3, background: "#f80" } }).png().toBuffer();
});

function makeStore(existing: string[] = []) {
  return {
    enabled: true,
    put: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn(async (key: string) => existing.includes(key)),
    presign: vi.fn(async (key: string) => `https://r2.example/${key}?sig=1`),
  };
}

function makeRepository() {
  return {
    upsert: vi.fn(async (input: NewReferenceImage) => ({ id: 1, createdAt: "", updatedAt: "", ...input })),
    findByName: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
  } satisfies ReferenceRepository;
}

const projects = {
  findOrCreate: vi.fn(async (name: string) => ({ id: 7, name, createdAt: "" })),
  findByName: vi.fn(async (name: string) => (name === "MV" ? { id: 7, name, createdAt: "" } : null)),
};

describe("media input keys", () => {
  it("accepts result keys, reference keys and https URLs only", () => {
    expect(isStoredKey("images/abc123-1.png")).toBe(true);
    expect(isStoredKey("refs/sister/main.jpg")).toBe(true);
    expect(isStoredKey("refs/Sister/main.jpg")).toBe(false);
    expect(isStoredKey("../etc/passwd")).toBe(false);
    expect(mediaInputSchema.safeParse("https://example.com/a.png").success).toBe(true);
    expect(mediaInputSchema.safeParse("http://example.com/a.png").success).toBe(false);
    expect(mediaInputSchema.safeParse("sister/main").success).toBe(false);
  });

  it("presigns keys and passes URLs through", async () => {
    const store = makeStore(["refs/sister/main.jpg"]);

    await expect(resolveMediaInputs(["https://x.example/a.png", "refs/sister/main.jpg"], store)).resolves.toEqual([
      "https://x.example/a.png",
      "https://r2.example/refs/sister/main.jpg?sig=1",
    ]);
    await expect(resolveMediaInputs(["refs/missing.png"], store)).rejects.toMatchObject({ code: "media_not_found" });
  });
});

describe("uploadReferenceSchema", () => {
  it("needs exactly one source and a folder-like name", () => {
    expect(uploadReferenceSchema.safeParse({ name: "sister/main", url: "https://a.example/x.png" }).success).toBe(true);
    expect(uploadReferenceSchema.safeParse({ name: "sister/main" }).success).toBe(false);
    expect(
      uploadReferenceSchema.safeParse({ name: "sister/main", url: "https://a.example/x.png", data_base64: "AAAA" }).success,
    ).toBe(false);
    expect(uploadReferenceSchema.safeParse({ name: "Sister Main", data_base64: "AAAA" }).success).toBe(false);
    expect(uploadReferenceSchema.safeParse({ name: "x", url: "http://a.example/x.png" }).success).toBe(false);
  });
});

describe("uploadReference", () => {
  it("stores a base64 image under refs/<name>.<ext> and records its size", async () => {
    const store = makeStore();
    const repository = makeRepository();

    const item = await uploadReference(
      { name: "sister/main", data_base64: png.toString("base64"), project: "MV" },
      store,
      repository,
      projects,
    );

    expect(store.put).toHaveBeenCalledWith("refs/sister/main.png", expect.any(Uint8Array), "image/png");
    expect(repository.upsert).toHaveBeenCalledWith({
      name: "sister/main",
      key: "refs/sister/main.png",
      contentType: "image/png",
      bytes: png.byteLength,
      width: 8,
      height: 6,
      projectId: 7,
    });
    expect(item).toMatchObject({ key: "refs/sister/main.png", url: "https://r2.example/refs/sister/main.png?sig=1", width: 8 });
  });

  it("copies a stored result by key through a presigned download", async () => {
    const store = makeStore(["images/task1-1.png"]);
    const fetchFn = vi.fn(async () => new Response(new Uint8Array(png)));

    await uploadReference({ name: "sets/living", key: "images/task1-1.png" }, store, makeRepository(), projects, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("https://r2.example/images/task1-1.png?sig=1");
    expect(store.put).toHaveBeenCalledWith("refs/sets/living.png", expect.any(Uint8Array), "image/png");
  });

  it("rejects files that are not images", async () => {
    await expect(
      uploadReference({ name: "bad", data_base64: Buffer.from("hello").toString("base64") }, makeStore(), makeRepository(), projects),
    ).rejects.toMatchObject({ code: "reference_not_image" });
  });

  it("fails clearly when storage is off", async () => {
    await expect(
      uploadReference({ name: "x", data_base64: png.toString("base64") }, { ...makeStore(), enabled: false }, makeRepository(), projects),
    ).rejects.toMatchObject({ code: "storage_not_configured" });
  });
});

describe("listReferences", () => {
  it("filters by project and presigns each key", async () => {
    const repository = makeRepository();
    repository.list.mockResolvedValue([
      { id: 1, name: "sister/main", key: "refs/sister/main.png", contentType: "image/png", bytes: 10, width: 8, height: 6, projectId: 7, createdAt: "", updatedAt: "" },
    ]);

    const items = await listReferences({ project: "MV" }, makeStore(), repository, projects);

    expect(repository.list).toHaveBeenCalledWith(7, 50);
    expect(items[0]).toMatchObject({ name: "sister/main", url: "https://r2.example/refs/sister/main.png?sig=1" });
    await expect(listReferences({ project: "nope" }, makeStore(), repository, projects)).resolves.toEqual([]);
  });
});
