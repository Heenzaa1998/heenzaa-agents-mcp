"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigationItems } from "@/content/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-[color:rgba(250,245,238,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Link className="flex items-center gap-4" href="/">
            <div className="flex size-12 items-center justify-center rounded-[1.2rem] bg-foreground text-background shadow-[0_16px_40px_rgba(47,29,13,0.18)]">
              <Activity className="size-5" />
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                Next.js Drizzle Template
              </span>
              <span className="text-sm text-muted-foreground">
                Lean starter with shadcn/ui, Drizzle, and observability built in.
              </span>
            </div>
          </Link>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <nav aria-label="Primary" className="flex flex-wrap gap-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background shadow-[0_14px_32px_rgba(47,29,13,0.16)]"
                        : "bg-card/75 text-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                    href={item.href as Route}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href="/api/health">Health JSON</a>
              </Button>
              <Button asChild size="sm">
                <a href="/metrics">
                  Metrics
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
