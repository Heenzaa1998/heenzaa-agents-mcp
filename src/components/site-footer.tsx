import { brand } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          <span className="font-display font-semibold text-foreground">{brand.name}</span>
          <span className="mx-2 text-border">/</span>
          {brand.tagline}
        </p>
        <nav aria-label="System" className="flex gap-4 font-mono text-xs">
          <a className="transition-colors hover:text-foreground" href="/api/health">
            /api/health
          </a>
          <a className="transition-colors hover:text-foreground" href="/metrics">
            /metrics
          </a>
        </nav>
      </div>
    </footer>
  );
}
