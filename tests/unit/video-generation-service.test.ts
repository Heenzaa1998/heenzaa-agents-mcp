import { describe, expect, it, vi } from "vitest";
import { getTaskStatus, startVideo } from "@/features/video-generation/service";
import { AppError } from "@/server/errors/app-error";

function makeHistory() {
  return {
    record: vi.fn().mockResolvedValue(undefined),
    finish: vi.fn().mockResolvedValue(undefined),
  };
}

describe("startVideo", () => {
  it("starts a Kling 3.0 task with elements by default", async () => {
    const client = {
      startVideo: vi.fn().mockResolvedValue({ taskId: "vid_3", model: "kling-3.0/video" }),
    };
    const history = makeHistory();

    await startVideo(
      {
        prompt: "@khing runs past the table",
        image_url: "https://example.com/first.png",
        duration: "4",
        elements: [{ name: "khing", description: "tuxedo kitten", image_urls: ["https://example.com/k.png", "https://example.com/k-face.png"] }],
        project: "EP",
        shot: "S08",
      },
      client,
      history,
    );

    expect(client.startVideo).toHaveBeenCalledWith({
      model: "kling-3.0",
      prompt: "@khing runs past the table",
      imageUrl: "https://example.com/first.png",
      aspectRatio: "16:9",
      duration: "4",
      sound: false,
      mode: "std",
      endImageUrl: undefined,
      elements: [{ name: "khing", description: "tuxedo kitten", imageUrls: ["https://example.com/k.png", "https://example.com/k-face.png"] }],
    });
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ model: "kling-3.0/video", status: "pending", durationSeconds: 4, shot: "S08" }),
    );
  });

  it("starts a Kling 2.6 text-to-video task and records it as pending", async () => {
    const client = {
      startVideo: vi
        .fn()
        .mockResolvedValue({ taskId: "vid_1", model: "kling-2.6/text-to-video" }),
    };
    const history = makeHistory();

    const result = await startVideo({ prompt: "  waves at dusk  ", model: "kling-2.6" }, client, history);

    expect(client.startVideo).toHaveBeenCalledWith({
      model: "kling-2.6",
      prompt: "waves at dusk",
      imageUrl: undefined,
      aspectRatio: "16:9",
      duration: "5",
      sound: false,
    });
    expect(history.record).toHaveBeenCalledWith({
      kind: "video",
      operation: "generate_video",
      model: "kling-2.6/text-to-video",
      prompt: "waves at dusk",
      status: "pending",
      taskId: "vid_1",
      durationSeconds: 5,
      inputs: [],
    });
    expect(result).toEqual({
      taskId: "vid_1",
      model: "kling-2.6/text-to-video",
      duration: "5",
    });
  });

  it("passes the image through for image-to-video", async () => {
    const client = {
      startVideo: vi
        .fn()
        .mockResolvedValue({ taskId: "vid_2", model: "kling-2.6/image-to-video" }),
    };

    await startVideo(
      { prompt: "cat blinks", image_url: "https://example.com/cat.png", model: "kling-2.6" },
      client,
      makeHistory(),
    );

    expect(client.startVideo).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: "https://example.com/cat.png" }),
    );
  });

  it("records a start failure with the model it would have used", async () => {
    const client = {
      startVideo: vi
        .fn()
        .mockRejectedValue(
          new AppError("nope", { code: "kie_http_error", statusCode: 502 }),
        ),
    };
    const history = makeHistory();

    await expect(
      startVideo(
        { prompt: "cat blinks", image_url: "https://example.com/cat.png", model: "kling-2.6" },
        client,
        history,
      ),
    ).rejects.toMatchObject({ code: "kie_http_error" });
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "kling-2.6/image-to-video",
        status: "fail",
        taskId: null,
      }),
    );
  });
});

describe("startVideo with storage keys", () => {
  it("resolves first/last frames and element images before calling KIE", async () => {
    const client = { startVideo: vi.fn().mockResolvedValue({ taskId: "vid_9", model: "kling-3.0/video" }) };
    const resolve = vi.fn(async (values: string[]) => values.map((v) => (v.startsWith("https://") ? v : `https://r2.example/${v}?sig=1`)));

    const history = makeHistory();

    await startVideo(
      {
        prompt: "@khing runs",
        image_url: "images/a-1.png",
        end_image_url: "images/b-1.png",
        elements: [{ name: "khing", description: "kitten", image_urls: ["refs/kid/front.jpg", "https://x.example/face.jpg"] }],
      },
      client,
      history,
      resolve,
    );

    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ inputs: ["images/a-1.png", "images/b-1.png", "refs/kid/front.jpg", "https://x.example/face.jpg"] }),
    );
    expect(client.startVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: "https://r2.example/images/a-1.png?sig=1",
        endImageUrl: "https://r2.example/images/b-1.png?sig=1",
        elements: [{ name: "khing", description: "kitten", imageUrls: ["https://r2.example/refs/kid/front.jpg?sig=1", "https://x.example/face.jpg"] }],
      }),
    );
  });
});

describe("getTaskStatus", () => {
  it("reports progress without persisting or recording while the task runs", async () => {
    const client = {
      getTask: vi.fn().mockResolvedValue({
        taskId: "vid_1",
        model: "kling-2.6/text-to-video",
        state: "generating",
        progress: 40,
      }),
    };
    const persist = vi.fn();
    const history = makeHistory();

    const result = await getTaskStatus({ task_id: "vid_1" }, client, persist, history);

    expect(result).toEqual({
      taskId: "vid_1",
      model: "kling-2.6/text-to-video",
      state: "generating",
      progress: 40,
    });
    expect(persist).not.toHaveBeenCalled();
    expect(history.finish).not.toHaveBeenCalled();
  });

  it("persists a finished video under videos/ and records success", async () => {
    const stored = {
      url: "https://r2.example/videos/vid_1-1.mp4?sig=1",
      key: "videos/vid_1-1.mp4",
      expiresInSeconds: 604800,
    };
    const client = {
      getTask: vi.fn().mockResolvedValue({
        taskId: "vid_1",
        model: "kling-2.6/text-to-video",
        state: "success",
        urls: ["https://kie.example/v.mp4"],
        creditsConsumed: 55,
      }),
    };
    const persist = vi.fn().mockResolvedValue([stored]);
    const history = makeHistory();

    const result = await getTaskStatus({ task_id: "vid_1" }, client, persist, history);

    expect(persist).toHaveBeenCalledWith(["https://kie.example/v.mp4"], {
      prefix: "videos",
      taskId: "vid_1",
    });
    expect(history.finish).toHaveBeenCalledWith("vid_1", {
      status: "success",
      media: [{ key: "videos/vid_1-1.mp4" }],
      credits: 55,
    });
    expect(result.media).toEqual([stored]);
  });

  it("uses the images prefix for a finished image task", async () => {
    const client = {
      getTask: vi.fn().mockResolvedValue({
        taskId: "img_1",
        model: "gpt-image-2-text-to-image",
        state: "success",
        urls: ["https://kie.example/i.png"],
      }),
    };
    const persist = vi.fn().mockResolvedValue([]);

    await getTaskStatus({ task_id: "img_1" }, client, persist, makeHistory());

    expect(persist).toHaveBeenCalledWith(["https://kie.example/i.png"], {
      prefix: "images",
      taskId: "img_1",
    });
  });

  it("returns and records the failure reason without persisting", async () => {
    const client = {
      getTask: vi.fn().mockResolvedValue({
        taskId: "vid_3",
        model: "kling-2.6/text-to-video",
        state: "fail",
        failReason: "422 content policy",
      }),
    };
    const persist = vi.fn();
    const history = makeHistory();

    const result = await getTaskStatus({ task_id: "vid_3" }, client, persist, history);

    expect(result.state).toBe("fail");
    expect(result.failReason).toBe("422 content policy");
    expect(persist).not.toHaveBeenCalled();
    expect(history.finish).toHaveBeenCalledWith("vid_3", {
      status: "fail",
      error: "422 content policy",
    });
  });
});
