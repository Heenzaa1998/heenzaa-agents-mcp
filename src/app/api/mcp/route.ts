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
import { listGenerationsSchema } from "@/features/generations/contracts";
import { listGenerations } from "@/features/generations/service";
import { getMediaUrlSchema } from "@/features/media/contracts";
import { getMediaUrl, type MediaItem } from "@/features/media/service";
import { getCostsSchema } from "@/features/projects/contracts";
import { getCostReport } from "@/features/projects/service";
import { listReferencesSchema, uploadReferenceSchema } from "@/features/references/contracts";
import { listReferences, uploadReference, type ReferenceItem } from "@/features/references/service";
import {
  generateTalkingVideoSchema,
  generateVideoSchema,
  getTaskStatusSchema,
} from "@/features/video-generation/contracts";
import {
  getTaskStatus,
  startTalkingVideo,
  startVideo,
} from "@/features/video-generation/service";
import type { GenerationRecord } from "@/server/db/schema";
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
  if (result.pending) {
    return textResult(
      `KIE is still working on this image (it can take a few minutes when the queue is busy). task_id: ${result.taskId}\nCall get_task_status with this task_id to get the download link; the credits are only charged once.`,
    );
  }

  const text = [
    `Generated ${result.media.length} image(s):`,
    ...result.media.map(describeItem),
  ].join("\n");

  return textResult(text);
}

function describeGeneration(record: GenerationRecord) {
  const prompt =
    record.prompt.length > 100 ? `${record.prompt.slice(0, 97)}...` : record.prompt;
  const lines = [
    `#${record.id} ${record.kind} · ${record.status} · ${record.createdAt.slice(0, 16)} UTC · "${prompt}"`,
  ];

  if (record.credits !== null || record.shot) {
    lines.push(
      `   ${[record.credits !== null ? `${record.credits} credits` : null, record.shot ? `shot: ${record.shot}` : null]
        .filter(Boolean)
        .join(" · ")}`,
    );
  }

  if (record.status === "pending" && record.taskId) {
    lines.push(`   task_id: ${record.taskId} (call get_task_status to finish it)`);
  }

  for (const ref of record.media) {
    lines.push(ref.key ? `   key: ${ref.key}` : `   temporary url: ${ref.url}`);
  }

  if (record.error) {
    lines.push(`   error: ${record.error}`);
  }

  return lines.join("\n");
}

function describeReference(item: ReferenceItem) {
  return `${item.name}\n   key: ${item.key} · ${item.width}×${item.height} · ${Math.round(item.bytes / 1024)} KB · link (valid ${Math.round(item.expiresInSeconds / 86_400)} days): ${item.url}`;
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
          "Edit or restyle existing image(s) with a text instruction. Inputs are https URLs or storage keys (refs/<name>.<ext> from upload_reference, images/<taskId>-1.png from a previous result), so no fresh link is needed.",
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
      "upload_reference",
      {
        title: "Upload a reference image",
        description:
          "Store an image under a name (e.g. sister/main) so later calls can use it by storage key instead of a URL: pass refs/<name>.<ext> to edit_image image_urls or generate_video image_url/elements. Source is one of url, key (a saved result) or data_base64. Same name replaces the old file.",
        inputSchema: uploadReferenceSchema,
      },
      async (args) => {
        try {
          const item = await uploadReference(args);

          return textResult(`Stored reference ${describeReference(item)}\nUse the key ${item.key} in edit_image or generate_video.`);
        } catch (error) {
          return toErrorResult(error, "Could not store the reference.");
        }
      },
    );

    server.registerTool(
      "list_references",
      {
        title: "List reference images",
        description:
          "List uploaded reference images (character sheets, sets) with their storage keys, newest first. Optionally only one project's.",
        inputSchema: listReferencesSchema,
      },
      async (args) => {
        try {
          const items = await listReferences(args);

          return textResult(
            items.length === 0
              ? "No references yet. Use upload_reference to add one."
              : [`${items.length} reference(s):`, ...items.map((item, index) => `${index + 1}. ${describeReference(item)}`)].join("\n"),
          );
        } catch (error) {
          return toErrorResult(error, "Could not list references.");
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
        title: "Generate video (Kling 3.0 / 2.6)",
        description:
          "Start a video from a text prompt, or animate an image by passing image_url (first frame) and optionally end_image_url. Kling 3.0 (default) keeps characters consistent via elements (reference images, mentioned as @name in the prompt) and takes 3–15s; kling-2.6 is cheaper (5 or 10s). Returns a task_id immediately; video takes minutes, so call get_task_status with it to get the result.",
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
      "generate_talking_video",
      {
        title: "Generate talking video (Kling AI Avatar)",
        description:
          "Animate a character image so its mouth follows a given speech file (lip sync), keeping your own dubbed voice. Pass image_url and audio_url (URLs or storage keys); the clip is as long as the audio. Best for close-ups of one character talking; use generate_video for action shots. Returns a task_id; call get_task_status with it.",
        inputSchema: generateTalkingVideoSchema,
      },
      async (args) => {
        try {
          const started = await startTalkingVideo(args);

          return textResult(
            `Talking video task started (${started.model}). task_id: ${started.taskId}\nCall get_task_status with this task_id to check progress; when it succeeds it returns the download link.`,
          );
        } catch (error) {
          return toErrorResult(error, "Could not start the talking video.");
        }
      },
    );

    server.registerTool(
      "get_task_status",
      {
        title: "Check a generation task",
        description:
          "Check a task started by generate_video or generate_talking_video, or an image task that generate_image/edit_image reported as still running. While running it reports progress; once finished it saves the file to storage and returns a download link plus a storage key.",
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

    server.registerTool(
      "list_generations",
      {
        title: "List past generations",
        description:
          "Search the history of images and videos made through this server, newest first. Returns storage keys (use get_media_url for a link) and task ids of unfinished videos.",
        inputSchema: listGenerationsSchema,
      },
      async (args) => {
        try {
          const records = await listGenerations(args);

          if (records.length === 0) {
            return textResult("No generations match.");
          }

          return textResult(
            [
              `Found ${records.length} generation(s):`,
              ...records.map(describeGeneration),
            ].join("\n"),
          );
        } catch (error) {
          return toErrorResult(error, "Could not list generations.");
        }
      },
    );

    server.registerTool(
      "get_costs",
      {
        title: "Report costs",
        description:
          "Report KIE credits spent and their baht value per project and shot: takes per shot (how many times it was regenerated), failed takes, chosen takes, cost per second of footage actually used, and the remaining credit balance.",
        inputSchema: getCostsSchema,
      },
      async (args) => {
        try {
          return textResult(await getCostReport(args));
        } catch (error) {
          return toErrorResult(error, "Could not build the cost report.");
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
