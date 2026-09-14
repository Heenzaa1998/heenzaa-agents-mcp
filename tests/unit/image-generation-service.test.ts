import { describe, expect, it, vi } from "vitest";
import { editImage, generateImage } from "@/features/image-generation/service";
import { AppError } from "@/server/errors/app-error";

describe("generateImage", () => {
  it("maps parsed input onto the KIE client and returns its result", async () => {
    const client = {
      generateImage: vi.fn().mockResolvedValue({
        taskId: "task_1",
        urls: ["https://img.example/1.png"],
      }),
    };

    const result = await generateImage(
      { prompt: "  a cat  ", aspect_ratio: "16:9", resolution: "2K" },
      client,
    );

    expect(client.generateImage).toHaveBeenCalledWith({
      prompt: "a cat",
      aspectRatio: "16:9",
      resolution: "2K",
      background: undefined,
    });
    expect(result.urls).toEqual(["https://img.example/1.png"]);
  });

  it("propagates a client failure as an AppError", async () => {
    const client = {
      generateImage: vi
        .fn()
        .mockRejectedValue(
          new AppError("boom", { code: "kie_http_error", statusCode: 502 }),
        ),
    };

    await expect(
      generateImage({ prompt: "x" }, client),
    ).rejects.toMatchObject({ code: "kie_http_error", statusCode: 502 });
  });
});

describe("editImage", () => {
  it("maps image_urls onto the client editImage call", async () => {
    const client = {
      editImage: vi.fn().mockResolvedValue({
        taskId: "task_2",
        urls: ["https://img.example/2.png"],
      }),
    };

    const result = await editImage(
      {
        prompt: "  make it night  ",
        image_urls: ["https://example.com/a.png"],
        quality: "high",
      },
      client,
    );

    expect(client.editImage).toHaveBeenCalledWith({
      prompt: "make it night",
      imageUrls: ["https://example.com/a.png"],
      aspectRatio: "3:2",
      quality: "high",
    });
    expect(result.urls).toEqual(["https://img.example/2.png"]);
  });
});
