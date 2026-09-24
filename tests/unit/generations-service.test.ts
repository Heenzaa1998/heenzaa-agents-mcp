import { describe, expect, it, vi } from "vitest";
import {
  finishGeneration,
  listGenerations,
  recordGeneration,
  toMediaRefs,
} from "@/features/generations/service";

const entry = {
  kind: "image",
  operation: "generate_image",
  model: "gpt-image-2-text-to-image",
  prompt: " a cat ",
  status: "success",
  taskId: "task_1",
};

describe("recordGeneration", () => {
  it("writes the parsed entry", async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: 1 }) };

    await recordGeneration(entry, repository);

    expect(repository.create).toHaveBeenCalledWith({
      ...entry,
      prompt: "a cat",
      media: [],
      error: null,
    });
  });

  it("never throws when the database fails", async () => {
    const repository = { create: vi.fn().mockRejectedValue(new Error("db down")) };

    await expect(recordGeneration(entry, repository)).resolves.toBeUndefined();
  });

  it("never throws on an invalid entry and does not write it", async () => {
    const repository = { create: vi.fn() };

    await expect(
      recordGeneration({ ...entry, kind: "audio" }, repository),
    ).resolves.toBeUndefined();
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe("finishGeneration", () => {
  it("updates the row for the task", async () => {
    const repository = { finishByTaskId: vi.fn().mockResolvedValue(1) };

    await finishGeneration(
      "vid_1",
      { status: "success", media: [{ key: "videos/vid_1-1.mp4" }] },
      repository,
    );

    expect(repository.finishByTaskId).toHaveBeenCalledWith("vid_1", {
      status: "success",
      media: [{ key: "videos/vid_1-1.mp4" }],
    });
  });

  it("never throws when the database fails", async () => {
    const repository = {
      finishByTaskId: vi.fn().mockRejectedValue(new Error("db down")),
    };

    await expect(
      finishGeneration("vid_1", { status: "fail", error: "x" }, repository),
    ).resolves.toBeUndefined();
  });
});

describe("listGenerations", () => {
  it("passes parsed filters to the repository", async () => {
    const records = [{ id: 1 }];
    const repository = { list: vi.fn().mockResolvedValue(records) };

    const result = await listGenerations({ kind: "video" }, repository);

    expect(repository.list).toHaveBeenCalledWith({ kind: "video", limit: 10 });
    expect(result).toBe(records);
  });

  it("rejects invalid filters", async () => {
    const repository = { list: vi.fn() };

    await expect(listGenerations({ limit: 500 }, repository)).rejects.toThrow();
    expect(repository.list).not.toHaveBeenCalled();
  });
});

describe("toMediaRefs", () => {
  it("keeps keys and only keeps the URL of unstored files", () => {
    expect(
      toMediaRefs([
        { url: "https://signed", key: "images/a-1.png", expiresInSeconds: 604800 },
        { url: "https://kie.example/b.png", key: null, expiresInSeconds: null },
      ]),
    ).toEqual([
      { key: "images/a-1.png" },
      { key: null, url: "https://kie.example/b.png" },
    ]);
  });
});
