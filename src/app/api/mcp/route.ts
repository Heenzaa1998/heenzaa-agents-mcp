import { createMcpHandler } from "mcp-handler";
import {
  editImageSchema,
  generateImageSchema,
} from "@/features/image-generation/contracts";
import { editImage, generateImage } from "@/features/image-generation/service";
import { AppError } from "@/server/errors/app-error";
import { observeRoute } from "@/server/http/observed-route";
import { withStaticAuth } from "@/server/http/static-auth";
import type { KieImageResult } from "@/server/kie/client";

// Image generation polls KIE until the task completes (~10-60s). Give the
// serverless function room to finish; Vercel Fluid compute allows up to 300s.
export const runtime = "nodejs";
export const maxDuration = 300;

const ROUTE = "/api/mcp";

function toToolResult(result: KieImageResult) {
  const lines = result.urls.map((url, index) => `${index + 1}. ${url}`);
  const text = [
    `Generated ${result.urls.length} image(s). URLs are hosted by KIE and expire in ~3 days:`,
    ...lines,
  ].join("\n");

  return { content: [{ type: "text" as const, text }] };
}

function toErrorResult(error: unknown) {
  const message =
    error instanceof AppError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error.";

  return {
    content: [{ type: "text" as const, text: `Image generation failed. ${message}` }],
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
          "Create a new image from a text prompt using OpenAI GPT Image via KIE.ai. Returns hosted image URL(s).",
        inputSchema: generateImageSchema,
      },
      async (args) => {
        try {
          return toToolResult(await generateImage(args));
        } catch (error) {
          return toErrorResult(error);
        }
      },
    );

    server.registerTool(
      "edit_image",
      {
        title: "Edit image (GPT Image)",
        description:
          "Edit or restyle existing image(s) from public URL(s) with a text instruction. Pass a previous result URL to iterate on the same image.",
        inputSchema: editImageSchema,
      },
      async (args) => {
        try {
          return toToolResult(await editImage(args));
        } catch (error) {
          return toErrorResult(error);
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
