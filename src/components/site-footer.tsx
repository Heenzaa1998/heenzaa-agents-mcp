import { brand } from "@/content/site";

export function SiteFooter({ tagline }: { tagline: string }) {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <p
          aria-hidden="true"
          className="select-none font-display text-[clamp(3rem,11vw,9rem)] font-semibold leading-none tracking-[-0.05em] text-white/[0.04]"
        >
          {brand.name}
        </p>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{tagline}</p>
          <nav aria-label="System" className="flex gap-4 font-mono text-xs">
            <a className="transition-colors hover:text-foreground" href="/api/health">
              /api/health
            </a>
            <a className="transition-colors hover:text-foreground" href="/metrics">
              /metrics
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
