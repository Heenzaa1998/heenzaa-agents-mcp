import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { navigationItems } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-[color:rgba(248,241,232,0.82)] backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:px-8">
        <div className="grid gap-3">
          <Badge className="w-fit">Production-ready but lean</Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            Ship the app, then hand the same URLs to developers and operators.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            The site doubles as a living primer: overview for the stack, guide
            for daily usage, and operations notes for health checks, metrics,
            logs, and traces once the app is running.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              Pages
            </p>
            {navigationItems.map((item) => (
              <Link
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                href={item.href as Route}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              Runtime endpoints
            </p>
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="/api/health"
            >
              /api/health
            </a>
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="/metrics"
            >
              /metrics
            </a>
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="/api/subscribers"
            >
              /api/subscribers
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
