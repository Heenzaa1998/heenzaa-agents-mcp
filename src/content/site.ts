// Language-independent product data. Translated copy lives in src/content/i18n.
export const brand = {
  name: "Heenzaa Studio",
} as const;

export const MCP_ENDPOINT_PATH = "/api/mcp";

export const navigationItems = [
  { href: "/", key: "studio" },
  { href: "/gallery", key: "gallery" },
] as const;

export const toolNames = [
  "generate_image",
  "edit_image",
  "generate_video",
  "get_task_status",
  "get_media_url",
  "list_generations",
] as const;

export type ToolName = (typeof toolNames)[number];

export const models = ["GPT Image", "Kling 2.6", "Cloudflare R2"] as const;

// Public showcase art made with the studio itself for this page (not the
// owner's private gallery). Files live in public/showcase.
export type ShowcaseImage = {
  src: string;
  width: number;
  height: number;
  prompt: string;
};

// Order matters: the first three form the hero stack (front, left, right) and
// the fourth backs the featured tool card.
export const showcase: readonly ShowcaseImage[] = [
  {
    src: "/showcase/neon-alley.webp",
    width: 1024,
    height: 1536,
    prompt: "Cinematic portrait in a neon-lit rainy Tokyo alley, teal and magenta light, 35mm film look",
  },
  {
    src: "/showcase/glass-bird.webp",
    width: 1200,
    height: 1200,
    prompt: "Glass hummingbird sculpture refracting rainbow light, black background",
  },
  {
    src: "/showcase/moon-cart.webp",
    width: 1200,
    height: 1200,
    prompt: "Retro-futuristic Thai street food cart on the moon, Earth rising behind it",
  },
  {
    src: "/showcase/chrome-ink.webp",
    width: 1200,
    height: 800,
    prompt: "Liquid chrome and lime green ink swirling together, deep black background",
  },
  {
    src: "/showcase/floating-island.webp",
    width: 1200,
    height: 800,
    prompt: "Floating island with a glowing tree above a sea of clouds at dusk",
  },
  {
    src: "/showcase/stairs.webp",
    width: 1024,
    height: 1536,
    prompt: "Brutalist concrete staircase, a single figure in a red coat, golden hour",
  },
];
