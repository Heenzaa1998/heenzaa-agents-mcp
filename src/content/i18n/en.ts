// English is the reference dictionary: every other language must have exactly
// these keys (enforced by the Dictionary type).
export const en = {
  meta: {
    description: "Images and videos, made by talking to Claude.",
  },
  nav: {
    studio: "Studio",
    gallery: "Gallery",
    language: "Language",
  },
  common: {
    copy: "Copy",
    copied: "Copied",
  },
  home: {
    badge: "MCP server for Claude",
    titleLead: "Make images and video",
    titleAccent: "just by asking.",
    intro:
      "Heenzaa Studio brings GPT Image and Kling 2.6 into your Claude chats. Every picture and clip is saved to private storage and waits for you in the gallery.",
    openGallery: "Open gallery",
    connect: "Connect Claude",
    heroToolDone: "done in 48s",
    heroSaved: "saved to storage",
    madeHere: "Made in the studio",
    toolsEyebrow: "Tools",
    toolsTitle: "Six tools, one connector.",
    tools: {
      generate_image: {
        medium: "Image",
        summary: "Turn a prompt into a picture with GPT Image, in any aspect ratio up to 4K.",
      },
      edit_image: {
        medium: "Image",
        summary: "Restyle or change an existing image. Pass a previous result to keep iterating.",
      },
      generate_video: {
        medium: "Video",
        summary: "Make a 5 or 10 second clip with Kling 2.6, from text or from one of your images.",
      },
      get_task_status: {
        medium: "Video",
        summary: "Check a clip in progress and collect the file when it is done.",
      },
      get_media_url: {
        medium: "Storage",
        summary: "Get a fresh download link for anything saved in storage.",
      },
      list_generations: {
        medium: "History",
        summary: "Search everything you have made by type, status or prompt.",
      },
    },
    stepsEyebrow: "How it works",
    stepsTitle: "From a sentence to a saved file.",
    steps: [
      { title: "Ask", detail: "Describe the picture or clip in a Claude chat with the connector on." },
      { title: "Route", detail: "The MCP server checks the request and calls the model. Keys never leave the server." },
      { title: "Generate", detail: "GPT Image draws pictures and Kling 2.6 renders video, both through KIE.ai." },
      { title: "Keep", detail: "Every file is copied to private storage and logged, so it shows up in the gallery." },
    ],
    connectEyebrow: "Connect",
    connectTitle: "Add it to Claude once.",
    connectSteps: [
      "In claude.ai, open Settings → Connectors and add a custom connector.",
      "Use this site's MCP endpoint as the URL.",
      "Add the request header with your MCP token.",
      "Start a new chat, turn the connector on, and ask for an image.",
    ],
    urlLabel: "URL",
    headerLabel: "Header",
    tokenNote: "The token is the MCP_AUTH_TOKEN set on the server. Requests without it get a 401.",
    copyEndpoint: "Copy endpoint URL",
  },
  gallery: {
    title: "Gallery",
    empty: "Nothing here yet.",
    summary: (count: number) =>
      `${count} ${count === 1 ? "item" : "items"}, newest first. Links on this page last an hour.`,
    signOut: "Sign out",
    filterType: "Filter by type",
    filterStatus: "Filter by status",
    all: "All",
    images: "Images",
    videos: "Videos",
    anyStatus: "Any status",
    search: "Search prompts",
    clearFilters: "Clear filters",
    kind: { image: "Image", video: "Video" },
    status: { success: "Done", pending: "Generating", fail: "Failed" },
    stillGenerating: "Still generating",
    generationFailed: "Generation failed",
    noFile: "No file",
    notStored: "Not in storage",
    check: "Check",
    open: "Open file",
    copyKey: "Copy storage key",
    noMatchTitle: "Nothing matches these filters",
    noMatchBody: "Try another type, status or search.",
    emptyTitle: "Your gallery is empty",
    emptyBody: "Ask Claude for an image or a video with the connector on, and it will appear here.",
  },
  login: {
    title: "The gallery is private",
    body: "Enter the gallery password to see your images and videos.",
    closed: "It is closed on this server until GALLERY_PASSWORD is set.",
    password: "Password",
    submit: "Open gallery",
    checking: "Checking…",
    wrongPassword: "Wrong password.",
    notConfigured: "The gallery is not configured on this server.",
  },
};

export type Dictionary = typeof en;
