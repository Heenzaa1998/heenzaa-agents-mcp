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
  it("starts a text-to-video task and records it as pending", async () => {
    const client = {
      startVideo: vi
        .fn()
        .mockResolvedValue({ taskId: "vid_1", model: "kling-2.6/text-to-video" }),
    };
    const history = makeHistory();

    const result = await startVideo({ prompt: "  waves at dusk  " }, client, history);

    expect(client.startVideo).toHaveBeenCalledWith({
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
      { prompt: "cat blinks", image_url: "https://example.com/cat.png" },
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
        { prompt: "cat blinks", image_url: "https://example.com/cat.png" },
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
