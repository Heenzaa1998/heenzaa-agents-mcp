"use client";

import { useSyncExternalStore } from "react";
import { CopyButton } from "@/components/copy-button";
import { MCP_ENDPOINT_PATH } from "@/content/site";

const noop = () => () => {};

// Shows the endpoint on whatever domain the site is served from; the server
// render falls back to the bare path.
export function EndpointUrl() {
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
  const url = `${origin}${MCP_ENDPOINT_PATH}`;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="truncate text-foreground">{url}</code>
      <CopyButton label="Copy endpoint URL" value={url} />
    </span>
  );
}
