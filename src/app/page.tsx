import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  Compass,
  DatabaseZap,
  Gauge,
  Logs,
  Route as RouteIcon,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { SubscribeForm } from "@/components/subscribe-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  architectureLayers,
  bootstrapSteps,
  navigationItems,
  observabilityChecklist,
  operatingPrinciples,
  scripts,
  stackItems,
  traceExample,
} from "@/content/site";

export const metadata: Metadata = {
  title: "Overview",
};

const highlights = [
  {
    description: "Request wrapper + OTEL spans from handlers into services and repositories.",
    icon: RouteIcon,
    title: "Traceable routes",
  },
  {
    description: "Pino logs carry request IDs and trace IDs so incidents can be stitched back together.",
    icon: Logs,
    title: "Correlated logging",
  },
  {
    description: "Prometheus exposition with process, route, and DB metrics at /metrics.",
    icon: Gauge,
    title: "Operational metrics",
  },
  {
    description: "Drizzle stays shallow, but repository spans still make database timing visible in Tempo.",
    icon: DatabaseZap,
    title: "DB visibility",
  },
] as const;

const pageCards = [
  {
    href: "/",
    icon: Compass,
    label: "Overview",
    summary: navigationItems[0].summary,
  },
  {
    href: "/guide",
    icon: BookOpenText,
    label: "Guide",
    summary: navigationItems[1].summary,
  },
  {
    href: "/operations",
    icon: Gauge,
    label: "Operations",
    summary: navigationItems[2].summary,
  },
] as const;

export default function Home() {
  const nextVersion = stackItems.find((item) => item.name === "Next.js")?.version ?? "16.x";

  return (
    <PageShell>
      <PageHero
        actions={
          <>
            <Button asChild size="lg">
              <Link href={"/guide" as Route}>
                Read the guide
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={"/operations" as Route}>Open the runbook</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="/metrics">Inspect /metrics</a>
            </Button>
          </>
        }
        aside={
          <>
            <Card className="rounded-[2rem] border-border/70 bg-[linear-gradient(180deg,rgba(255,250,244,0.96),rgba(246,235,219,0.92))] shadow-[0_24px_70px_rgba(111,63,20,0.12)]">
              <CardHeader>
                <Badge className="w-fit" variant="secondary">
                  Running app
                </Badge>
                <CardTitle className="text-2xl">Three pages, one clear hand-off</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {pageCards.map((card) => (
                  <Link
                    className="rounded-[1.4rem] border border-border/70 bg-background/78 px-4 py-4 transition-transform hover:-translate-y-0.5"
                    href={card.href as Route}
                    key={card.href}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                        <card.icon className="size-5" />
                      </div>
                      <p className="font-semibold tracking-tight">{card.label}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {card.summary}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <div className="rounded-[2rem] border border-border/70 bg-stone-950 p-6 text-stone-100 shadow-[0_24px_70px_rgba(35,25,15,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/80">
                Span shape
              </p>
              <pre className="mt-4 overflow-x-auto text-sm leading-7 text-stone-200">
                <code>{traceExample}</code>
              </pre>
              <p className="mt-4 text-sm leading-6 text-stone-300">
                The sample subscriber flow proves tracing continues through the
                service layer and into the database without adding heavy
                abstractions.
              </p>
            </div>
          </>
        }
        badges={[
          "Production-ready starter",
          `Next.js ${nextVersion}`,
          "OpenTelemetry to Tempo",
        ]}
        description="Tailwind v4 and shadcn/ui for the interface, Zod and Drizzle for feature boundaries, plus structured logs, Prometheus metrics, and end-to-end tracing from request entry to database work."
        eyebrow="Lean architecture"
        title="Next.js template with tracing, metrics, and Drizzle."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Core highlights">
        {highlights.map((highlight) => {
          const Icon = highlight.icon;

          return (
            <article
              className="rounded-[1.6rem] border border-border/70 bg-card/82 p-5 shadow-[0_18px_48px_rgba(111,63,20,0.11)] backdrop-blur"
              key={highlight.title}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-base font-semibold tracking-tight">{highlight.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {highlight.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pageCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              className="rounded-[1.8rem] border border-border/70 bg-card/84 p-6 shadow-[0_22px_60px_rgba(111,63,20,0.12)]"
              key={card.href}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                    {card.href}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{card.label}</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{card.summary}</p>
              <Button asChild className="mt-5" variant="outline">
                <Link href={card.href as Route}>
                  Open page
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Core stack">
        {stackItems.map((item) => (
          <article
            className="rounded-[1.6rem] border border-border/70 bg-card/82 p-5 shadow-[0_18px_48px_rgba(111,63,20,0.11)] backdrop-blur"
            key={item.name}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight">{item.name}</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {item.version}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          description="Lean rules that keep the template maintainable once the codebase grows."
          eyebrow="Operating model"
          title="Production-ready defaults"
        >
          <ul className="grid gap-3">
            {operatingPrinciples.map((principle) => (
              <li
                className="rounded-2xl border border-border/60 bg-background/65 px-4 py-3 text-sm leading-6 text-muted-foreground"
                key={principle}
              >
                {principle}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          description="Folders stay shallow, but the observability pieces still have clear homes."
          eyebrow="Structure"
          title="Project layout"
        >
          <ul className="grid gap-3">
            {architectureLayers.map((layer) => (
              <li
                className="grid gap-2 rounded-2xl border border-border/60 bg-background/65 px-4 py-3"
                key={layer.path}
              >
                <code className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {layer.path}
                </code>
                <span className="text-sm leading-6 text-muted-foreground">
                  {layer.detail}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          description="The command surface is small on purpose, but it still covers testing and observability."
          eyebrow="Scripts"
          title="Daily commands"
        >
          <ul className="grid gap-3">
            {scripts.map((script) => (
              <li
                className="grid gap-2 rounded-2xl border border-border/60 bg-background/65 px-4 py-3"
                key={script.name}
              >
                <code className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {script.name}
                </code>
                <span className="text-sm leading-6 text-muted-foreground">
                  {script.detail}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          description="The subscriber flow is a real end-to-end example that exercises validation, tracing, logging, and persistence."
          eyebrow="Example feature"
          title="Subscribers flow"
        >
          <SubscribeForm />
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[1.9rem] border border-border/70 bg-card/84 p-6 shadow-[0_24px_70px_rgba(111,63,20,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
            Included baseline
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Observability is part of the template, not an afterthought.
          </h2>
          <ul className="mt-6 grid gap-3">
            {observabilityChecklist.map((item) => (
              <li
                className="rounded-2xl border border-border/60 bg-background/65 px-4 py-3 text-sm leading-6 text-muted-foreground"
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1.9rem] border border-border/70 bg-[linear-gradient(180deg,rgba(247,240,227,0.96),rgba(243,231,213,0.86))] p-6 shadow-[0_24px_70px_rgba(111,63,20,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
            First 15 minutes
          </p>
          <div className="mt-4 grid gap-4">
            {bootstrapSteps.map((step, index) => (
              <div
                className="grid grid-cols-[2.75rem_1fr] gap-3 rounded-2xl border border-border/60 bg-card/75 p-4"
                key={step}
              >
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-6 text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
