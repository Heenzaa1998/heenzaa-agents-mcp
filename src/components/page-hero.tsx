import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  actions?: ReactNode;
  aside?: ReactNode;
  badges?: readonly string[];
  className?: string;
  description: string;
  eyebrow: string;
  title: string;
};

export function PageHero({
  actions,
  aside,
  badges = [],
  className,
  description,
  eyebrow,
  title,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/88 p-7 shadow-[0_28px_80px_rgba(111,63,20,0.16)] backdrop-blur md:p-9">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/18 via-transparent to-accent/30" />

        {badges.length > 0 ? (
          <div className="relative flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge} variant={badge === badges[0] ? "default" : "secondary"}>
                {badge}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="relative mt-6 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-[12ch] text-5xl font-semibold tracking-[-0.08em] text-balance text-foreground sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>

        {actions ? <div className="relative mt-8 flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      {aside ? <aside className="grid gap-5">{aside}</aside> : null}
    </section>
  );
}
