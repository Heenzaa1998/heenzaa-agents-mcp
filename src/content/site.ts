// Product copy lives here so the brand can be renamed in one place.
export const brand = {
  name: "Heenzaa Studio",
  tagline: "Images and videos, made by talking to Claude.",
} as const;

export const MCP_ENDPOINT_PATH = "/api/mcp";

export const navigationItems = [
  { href: "/", label: "Studio" },
  { href: "/gallery", label: "Gallery" },
] as const;

export const mcpTools = [
  {
    name: "generate_image",
    medium: "Image",
    summary: "Turn a prompt into a picture with GPT Image, in any aspect ratio up to 4K.",
  },
  {
    name: "edit_image",
    medium: "Image",
    summary: "Restyle or change an existing image. Pass a previous result to keep iterating.",
  },
  {
    name: "generate_video",
    medium: "Video",
    summary: "Make a 5 or 10 second clip with Kling 2.6, from text or from one of your images.",
  },
  {
    name: "get_task_status",
    medium: "Video",
    summary: "Check a clip in progress and collect the file when it is done.",
  },
  {
    name: "get_media_url",
    medium: "Storage",
    summary: "Get a fresh download link for anything saved in storage.",
  },
  {
    name: "list_generations",
    medium: "History",
    summary: "Search everything you have made by type, status or prompt.",
  },
] as const;

export const pipelineSteps = [
  {
    title: "Ask",
    detail: "Describe the picture or clip in a Claude chat with the connector turned on.",
  },
  {
    title: "Route",
    detail: "The MCP server checks the request and calls the model. Keys never leave the server.",
  },
  {
    title: "Generate",
    detail: "GPT Image draws pictures and Kling 2.6 renders video, both through KIE.ai.",
  },
  {
    title: "Keep",
    detail: "Every file is copied to private storage and logged, so it shows up in the gallery.",
  },
] as const;

export const connectSteps = [
  "In claude.ai, open Settings → Connectors and add a custom connector.",
  "Use this site's MCP endpoint as the URL.",
  "Add the request header with your MCP token.",
  "Start a new chat, turn the connector on, and ask for an image.",
] as const;
