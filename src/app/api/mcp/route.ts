import { createMcpHandler } from "mcp-handler";
import {
  editImageSchema,
  generateImageSchema,
} from "@/features/image-generation/contracts";
import {
  editImage,
  generateImage,
  type ImageGenerationResult,
} from "@/features/image-generation/service";
import { getMediaUrlSchema } from "@/features/media/contracts";
import { getMediaUrl, type MediaItem } from "@/features/media/service";
import {
  generateVideoSchema,
  getTaskStatusSchema,
} from "@/features/video-generation/contracts";
import { getTaskStatus, startVideo } from "@/features/video-generation/service";
import { AppError } from "@/server/errors/app-error";
import { observeRoute } from "@/server/http/observed-route";
import { withStaticAuth } from "@/server/http/static-auth";

// Image generation polls KIE until the task completes (~10-90s) and then copies
// the file into storage. Vercel Fluid compute allows up to 300s.
export const runtime = "nodejs";
export const maxDuration = 300;

const ROUTE = "/api/mcp";

function linkDays(item: MediaItem) {
  return Math.round((item.expiresInSeconds ?? 0) / 86_400);
}

function describeItem(item: MediaItem, index: number) {
  if (item.key === null) {
    return `${index + 1}. ${item.url}\n   Temporary provider link (expires within days); not saved to storage.`;
  }

  return `${index + 1}. ${item.url}\n   Saved as ${item.key}. Link valid ${linkDays(item)} days; call get_media_url with this key for a fresh link.`;
}

function toToolResult(result: ImageGenerationResult) {
  const text = [
    `Generated ${result.media.length} image(s):`,
    ...result.media.map(describeItem),
  ].join("\n");

  return textResult(text);
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function toErrorResult(error: unknown, summary: string) {
  const message =
    error instanceof AppError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error.";

  return {
    content: [{ type: "text" as const, text: `${summary} ${message}` }],
    isError: true,
  };
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "generate_image",
      {
        title: "Generate image (GPT Image)",
        description:
          "Create a new image from a text prompt using OpenAI GPT Image via KIE.ai. Saves the result to storage and returns a download link plus a storage key.",
        inputSchema: generateImageSchema,
      },
      async (args) => {
        try {
          return toToolResult(await generateImage(args));
        } catch (error) {
          return toErrorResult(error, "Image generation failed.");
        }
      },
    );

    server.registerTool(
      "edit_image",
      {
        title: "Edit image (GPT Image)",
        description:
          "Edit or restyle existing image(s) from URL(s) with a text instruction. To iterate on a previous result, pass its link (call get_media_url first if the link has expired).",
        inputSchema: editImageSchema,
      },
      async (args) => {
        try {
          return toToolResult(await editImage(args));
        } catch (error) {
          return toErrorResult(error, "Image generation failed.");
        }
      },
    );

    server.registerTool(
      "get_media_url",
      {
        title: "Get a fresh link for stored media",
        description:
          "Return a new time-limited download link (valid 7 days) for a file saved by generate_image or edit_image, identified by its storage key.",
        inputSchema: getMediaUrlSchema,
      },
      async (args) => {
        try {
          const item = await getMediaUrl(args);

          return {
            content: [
              {
                type: "text" as const,
                text: `${item.url}\nKey ${item.key}; link valid ${linkDays(item)} days.`,
              },
            ],
          };
        } catch (error) {
          return toErrorResult(error, "Could not get a media link.");
        }
      },
    );

    server.registerTool(
      "generate_video",
      {
        title: "Generate video (Kling 2.6)",
        description:
          "Start a video from a text prompt, or animate an image by passing image_url. Returns a task_id immediately; video takes minutes, so call get_task_status with it to get the result.",
        inputSchema: generateVideoSchema,
      },
      async (args) => {
        try {
          const started = await startVideo(args);

          return textResult(
            `Video task started (${started.model}, ${started.duration}s). task_id: ${started.taskId}\nGeneration can take up to about 10 minutes, most of it waiting in the provider's queue. Call get_task_status with this task_id to check progress; when it succeeds it returns the download link.`,
          );
        } catch (error) {
          return toErrorResult(error, "Could not start the video.");
        }
      },
    );

    server.registerTool(
      "get_task_status",
      {
        title: "Check a generation task",
        description:
          "Check a task started by generate_video. While running it reports progress; once finished it saves the file to storage and returns a download link plus a storage key.",
        inputSchema: getTaskStatusSchema,
      },
      async (args) => {
        try {
          const status = await getTaskStatus(args);

          if (status.state === "fail") {
            return {
              ...textResult(`Task ${status.taskId} failed: ${status.failReason}`),
              isError: true,
            };
          }

          if (status.media) {
            return textResult(
              [
                `Task ${status.taskId} finished:`,
                ...status.media.map(describeItem),
              ].join("\n"),
            );
          }

          const progress =
            status.progress !== undefined ? ` (${status.progress}%)` : "";

          return textResult(
            `Task ${status.taskId} is ${status.state}${progress}. Not ready yet; check again in about a minute.`,
          );
        } catch (error) {
          return toErrorResult(error, "Could not check the task.");
        }
      },
    );
  },
  {
    serverInfo: { name: "heenzaa-image-mcp", version: "0.1.0" },
  },
);

// Protect the endpoint with a shared static token (no-op when MCP_AUTH_TOKEN is
// unset). Kept inside observeRoute so 401s are still counted and logged.
const guardedHandler = withStaticAuth(mcpHandler);

const observedGet = observeRoute({ method: "GET", route: ROUTE }, guardedHandler);
const observedPost = observeRoute({ method: "POST", route: ROUTE }, guardedHandler);
const observedDelete = observeRoute(
  { method: "DELETE", route: ROUTE },
  guardedHandler,
);

export { observedGet as GET, observedPost as POST, observedDelete as DELETE };
