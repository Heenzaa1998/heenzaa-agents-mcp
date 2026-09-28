import { describe, expect, it, vi } from "vitest";
import { editImage, generateImage } from "@/features/image-generation/service";
import { AppError } from "@/server/errors/app-error";

const storedItem = {
  url: "https://r2.example/images/task_1-1.png?sig=1",
  key: "images/task_1-1.png",
  expiresInSeconds: 604800,
};

function makeHistory() {
  return { record: vi.fn().mockResolvedValue(undefined) };
}

describe("generateImage", () => {
  it("maps parsed input onto the KIE client, persists and records the result", async () => {
    const client = {
      generateImage: vi.fn().mockResolvedValue({
        taskId: "task_1",
        urls: ["https://img.example/1.png"],
        creditsConsumed: 6,
      }),
    };
    const persist = vi.fn().mockResolvedValue([storedItem]);
    const history = makeHistory();

    const result = await generateImage(
      { prompt: "  a cat  ", aspect_ratio: "16:9", resolution: "2K" },
      client,
      persist,
      history,
    );

    expect(client.generateImage).toHaveBeenCalledWith({
      prompt: "a cat",
      aspectRatio: "16:9",
      resolution: "2K",
      background: undefined,
    });
    expect(persist).toHaveBeenCalledWith(["https://img.example/1.png"], {
      prefix: "images",
      taskId: "task_1",
    });
    expect(history.record).toHaveBeenCalledWith({
      kind: "image",
      operation: "generate_image",
      model: "gpt-image-2-text-to-image",
      prompt: "a cat",
      status: "success",
      taskId: "task_1",
      media: [{ key: "images/task_1-1.png" }],
      credits: 6,
    });
    expect(result).toEqual({ taskId: "task_1", media: [storedItem] });
  });

  it("records the failure and rethrows without persisting", async () => {
    const client = {
      generateImage: vi
        .fn()
        .mockRejectedValue(
          new AppError("boom", { code: "kie_http_error", statusCode: 502 }),
        ),
    };
    const persist = vi.fn();
    const history = makeHistory();

    await expect(
      generateImage({ prompt: "x" }, client, persist, history),
    ).rejects.toMatchObject({ code: "kie_http_error", statusCode: 502 });
    expect(persist).not.toHaveBeenCalled();
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "fail",
        taskId: null,
        error: "kie_http_error: boom",
      }),
    );
  });
});

describe("editImage", () => {
  it("maps image_urls onto gpt-image-2, persists and records the result", async () => {
    const client = {
      editImage: vi.fn().mockResolvedValue({
        taskId: "task_2",
        urls: ["https://img.example/2.png"],
        creditsConsumed: 6,
      }),
    };
    const persist = vi.fn().mockResolvedValue([storedItem]);
    const history = makeHistory();

    const result = await editImage(
      {
        prompt: "  make it night  ",
        image_urls: ["https://example.com/a.png"],
        aspect_ratio: "9:16",
        resolution: "2K",
      },
      client,
      persist,
      history,
    );

    expect(client.editImage).toHaveBeenCalledWith({
      prompt: "make it night",
      imageUrls: ["https://example.com/a.png"],
      model: "gpt-image-2",
      aspectRatio: "9:16",
      resolution: "2K",
      background: undefined,
    });
    expect(persist).toHaveBeenCalledWith(["https://img.example/2.png"], {
      prefix: "images",
      taskId: "task_2",
    });
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "edit_image",
        model: "gpt-image-2-image-to-image",
        status: "success",
        taskId: "task_2",
        credits: 6,
      }),
    );
    expect(result.media).toEqual([storedItem]);
  });

  it("uses gpt-image-1.5 when asked, mapping auto to 3:2", async () => {
    const client = {
      editImage: vi.fn().mockResolvedValue({ taskId: "task_3", urls: ["https://img.example/3.png"] }),
    };
    const history = makeHistory();

    await editImage(
      {
        prompt: "make it night",
        image_urls: ["https://example.com/a.png"],
        model: "gpt-image-1.5",
        quality: "high",
      },
      client,
      vi.fn().mockResolvedValue([storedItem]),
      history,
    );

    expect(client.editImage).toHaveBeenCalledWith({
      prompt: "make it night",
      imageUrls: ["https://example.com/a.png"],
      model: "gpt-image-1.5",
      aspectRatio: "3:2",
      quality: "high",
    });
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-image/1.5-image-to-image", status: "success" }),
    );
  });
});
