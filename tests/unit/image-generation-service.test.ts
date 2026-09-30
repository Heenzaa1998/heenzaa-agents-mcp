import { describe, expect, it, vi } from "vitest";
import { editImage, generateImage } from "@/features/image-generation/service";
import { AppError } from "@/server/errors/app-error";
import type { ImageTaskHooks, KieImageResult } from "@/server/kie/client";

const storedItem = {
  url: "https://r2.example/images/task_1-1.png?sig=1",
  key: "images/task_1-1.png",
  expiresInSeconds: 604800,
};

function makeHistory() {
  return { record: vi.fn().mockResolvedValue(undefined), finish: vi.fn().mockResolvedValue(undefined) };
}

// A client stub that accepts the task (calling onStarted) and then resolves with `outcome`.
function accepting(taskId: string, outcome: object | Error) {
  return vi.fn(async (_params: unknown, hooks?: ImageTaskHooks): Promise<KieImageResult> => {
    await hooks?.onStarted?.(taskId);
    if (outcome instanceof Error) throw outcome;
    return { taskId, ...outcome } as KieImageResult;
  });
}

describe("generateImage", () => {
  it("maps parsed input onto the KIE client, persists and records the result", async () => {
    const client = { generateImage: accepting("task_1", {
      state: "success",
      urls: ["https://img.example/1.png"],
      creditsConsumed: 6,
    }) };
    const persist = vi.fn().mockResolvedValue([storedItem]);
    const history = makeHistory();

    const result = await generateImage(
      { prompt: "  a cat  ", aspect_ratio: "16:9", resolution: "2K" },
      client,
      persist,
      history,
    );

    expect(client.generateImage).toHaveBeenCalledWith(
      { prompt: "a cat", aspectRatio: "16:9", resolution: "2K", background: undefined },
      expect.objectContaining({ onStarted: expect.any(Function) }),
    );
    expect(persist).toHaveBeenCalledWith(["https://img.example/1.png"], {
      prefix: "images",
      taskId: "task_1",
    });
    // Recorded as pending the moment KIE accepted it, then closed with the result.
    expect(history.record).toHaveBeenCalledWith({
      kind: "image",
      operation: "generate_image",
      model: "gpt-image-2-text-to-image",
      prompt: "a cat",
      status: "pending",
      taskId: "task_1",
    });
    expect(history.finish).toHaveBeenCalledWith("task_1", {
      status: "success",
      media: [{ key: "images/task_1-1.png" }],
      credits: 6,
    });
    expect(result).toEqual({ taskId: "task_1", media: [storedItem], pending: false });
  });

  it("leaves the task pending when KIE is still working after the wait", async () => {
    const client = { generateImage: accepting("task_slow", { state: "pending" }) };
    const persist = vi.fn();
    const history = makeHistory();

    const result = await generateImage({ prompt: "x" }, client, persist, history);

    expect(result).toEqual({ taskId: "task_slow", media: [], pending: true });
    expect(persist).not.toHaveBeenCalled();
    expect(history.record).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", taskId: "task_slow" }));
    expect(history.finish).not.toHaveBeenCalled();
  });

  it("closes an accepted task as failed when KIE reports failure", async () => {
    const client = {
      generateImage: accepting(
        "task_bad",
        new AppError("KIE task failed: policy", { code: "kie_task_failed", statusCode: 502 }),
      ),
    };
    const history = makeHistory();

    await expect(generateImage({ prompt: "x" }, client, vi.fn(), history)).rejects.toMatchObject({
      code: "kie_task_failed",
    });
    expect(history.record).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", taskId: "task_bad" }));
    expect(history.finish).toHaveBeenCalledWith("task_bad", {
      status: "fail",
      error: "kie_task_failed: KIE task failed: policy",
    });
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
    const client = { editImage: accepting("task_2", {
      state: "success",
      urls: ["https://img.example/2.png"],
      creditsConsumed: 6,
    }) };
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

    expect(client.editImage).toHaveBeenCalledWith(
      {
        prompt: "make it night",
        imageUrls: ["https://example.com/a.png"],
        model: "gpt-image-2",
        aspectRatio: "9:16",
        resolution: "2K",
        background: undefined,
      },
      expect.anything(),
    );
    expect(persist).toHaveBeenCalledWith(["https://img.example/2.png"], {
      prefix: "images",
      taskId: "task_2",
    });
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "edit_image", model: "gpt-image-2-image-to-image", status: "pending", taskId: "task_2" }),
    );
    expect(history.finish).toHaveBeenCalledWith("task_2", expect.objectContaining({ status: "success", credits: 6 }));
    expect(result.media).toEqual([storedItem]);
  });

  it("uses gpt-image-1.5 when asked, mapping auto to 3:2", async () => {
    const client = { editImage: accepting("task_3", { state: "success", urls: ["https://img.example/3.png"] }) };
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

    expect(client.editImage).toHaveBeenCalledWith(
      {
        prompt: "make it night",
        imageUrls: ["https://example.com/a.png"],
        model: "gpt-image-1.5",
        aspectRatio: "3:2",
        quality: "high",
      },
      expect.anything(),
    );
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-image/1.5-image-to-image", status: "pending" }),
    );
  });
});
