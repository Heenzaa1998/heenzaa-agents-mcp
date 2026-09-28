import Link from "next/link";
import { ArrowRight, Film, History, ImageIcon, KeyRound, Plug } from "lucide-react";
import { EndpointUrl } from "@/components/endpoint-url";
import { Button } from "@/components/ui/button";
import { brand, connectSteps, mcpTools, pipelineSteps } from "@/content/site";

const mediumIcons = {
  History,
  Image: ImageIcon,
  Storage: KeyRound,
  Video: Film,
} as const;

// A decorative, CSS-only picture of a chat calling a tool. The home page is
// public, so it never shows the owner's real generations.
function ChatPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative rounded-2xl border border-border bg-card p-4 shadow-[0_40px_120px_-40px_oklch(0.9_0.2_125/25%)]"
    >
      <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-secondary px-4 py-3 text-sm">
        A paper crane taking off at dawn, poster, 16:9
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background/60 p-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-primary">generate_image</span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            done in 48s
          </span>
        </div>
        <div className="mt-2 text-muted-foreground">
          {"{ "}aspect_ratio: <span className="text-foreground">&quot;16:9&quot;</span>
          {" }"}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <div className="relative aspect-video bg-[radial-gradient(120%_90%_at_70%_110%,oklch(0.75_0.17_55)_0%,oklch(0.55_0.18_20)_28%,oklch(0.3_0.1_300)_58%,oklch(0.16_0.03_285)_100%)]">
          <div className="absolute bottom-[28%] left-[52%] h-10 w-16 -rotate-12 bg-[oklch(0.96_0.01_90)] [clip-path:polygon(0_60%,45%_0,55%_45%,100%_20%,60%_70%,40%_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        <div className="flex items-center justify-between bg-background/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          <span>images/7f3a…-1.png</span>
          <span className="text-primary">saved</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-28 px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pt-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-7">
          <span className="flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            MCP server for Claude
          </span>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
            Make images and video by just asking.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            {brand.name} plugs GPT Image and Kling 2.6 into your Claude chats. Every
            picture and clip is saved to private storage and waits for you in the
            gallery.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/gallery">
                Open gallery
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#connect">
                <Plug />
                Connect Claude
              </a>
            </Button>
          </div>
        </div>
        <ChatPreview />
      </section>

      <section className="flex flex-col gap-8" id="tools">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Tools</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Six tools, one connector.
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {mcpTools.map((tool) => {
            const Icon = mediumIcons[tool.medium];

            return (
              <div className="flex flex-col gap-3 bg-card p-6" key={tool.name}>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="size-3.5" />
                  {tool.medium}
                </span>
                <code className="text-sm text-foreground">{tool.name}</code>
                <p className="text-sm leading-6 text-muted-foreground">{tool.summary}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            From a sentence to a saved file.
          </h2>
        </div>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pipelineSteps.map((step, index) => (
            <li className="flex flex-col gap-3 border-t border-border pt-5" key={step.title}>
              <span className="font-mono text-xs text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="grid gap-10 rounded-2xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-2"
        id="connect"
      >
        <div className="flex flex-col gap-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Connect</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Add it to Claude once.
          </h2>
          <ol className="flex flex-col gap-3">
            {connectSteps.map((step, index) => (
              <li className="flex gap-3 text-sm leading-6 text-muted-foreground" key={step}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs text-foreground">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-xl border border-border bg-background p-5 font-mono text-xs">
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-muted-foreground">URL</span>
            <EndpointUrl />
          </div>
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-muted-foreground">Header</span>
            <code className="break-all text-foreground">
              Authorization: Bearer <span className="text-primary">&lt;MCP_AUTH_TOKEN&gt;</span>
            </code>
          </div>
          <p className="mt-2 font-sans text-xs leading-5 text-muted-foreground">
            The token is the <code>MCP_AUTH_TOKEN</code> set on the server. Requests
            without it get a 401.
          </p>
        </div>
      </section>
    </main>
  );
}
