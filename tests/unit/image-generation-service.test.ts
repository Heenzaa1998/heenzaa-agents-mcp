import { describe, expect, it, vi } from "vitest";
import { editImage, generateImage } from "@/features/image-generation/service";
import { AppError } from "@/server/errors/app-error";

const storedItem = {
  url: "https://r2.example/images/task_1-1.png?sig=1",
  key: "images/task_1-1.png",
  expiresInSeconds: 604800,
};

describe("generateImage", () => {
  it("maps parsed input onto the KIE client and persists the result", async () => {
    const client = {
      generateImage: vi.fn().mockResolvedValue({
        taskId: "task_1",
        urls: ["https://img.example/1.png"],
      }),
    };
    const persist = vi.fn().mockResolvedValue([storedItem]);

    const result = await generateImage(
      { prompt: "  a cat  ", aspect_ratio: "16:9", resolution: "2K" },
      client,
      persist,
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
    expect(result).toEqual({ taskId: "task_1", media: [storedItem] });
  });

  it("propagates a client failure as an AppError without persisting", async () => {
    const client = {
      generateImage: vi
        .fn()
        .mockRejectedValue(
          new AppError("boom", { code: "kie_http_error", statusCode: 502 }),
        ),
    };
    const persist = vi.fn();

    await expect(
      generateImage({ prompt: "x" }, client, persist),
    ).rejects.toMatchObject({ code: "kie_http_error", statusCode: 502 });
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("editImage", () => {
  it("maps image_urls onto the client editImage call and persists the result", async () => {
    const client = {
      editImage: vi.fn().mockResolvedValue({
        taskId: "task_2",
        urls: ["https://img.example/2.png"],
      }),
    };
    const persist = vi.fn().mockResolvedValue([storedItem]);

    const result = await editImage(
      {
        prompt: "  make it night  ",
        image_urls: ["https://example.com/a.png"],
        quality: "high",
      },
      client,
      persist,
    );

    expect(client.editImage).toHaveBeenCalledWith({
      prompt: "make it night",
      imageUrls: ["https://example.com/a.png"],
      aspectRatio: "3:2",
      quality: "high",
    });
    expect(persist).toHaveBeenCalledWith(["https://img.example/2.png"], {
      prefix: "images",
      taskId: "task_2",
    });
    expect(result.media).toEqual([storedItem]);
  });
});
