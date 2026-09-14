import type { Metadata } from "next";
import { Activity, ArrowUpRight, ChartNoAxesCombined, Gauge, Logs, Radar } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ignorePathsExample,
  localObservabilityEndpoints,
  monitoringSignals,
  observabilityChecklist,
  operatorRunbook,
  scripts,
  traceExample,
} from "@/content/site";

export const metadata: Metadata = {
  title: "Operations",
};

const operationsHighlights = [
  {
    description: "Health JSON gives a fast answer on reachability, DB mode, and tracing state.",
    icon: Activity,
    title: "Health first",
  },
  {
    description: "Prometheus metrics expose the request surface and database activity without extra glue code.",
    icon: Gauge,
    title: "Metrics ready",
  },
  {
    description: "Tempo keeps route, service, repository, and DB spans in one request tree.",
    icon: Radar,
    title: "Trace continuity",
  },
  {
    description: "Request IDs and trace IDs stay in logs so incidents can be reconstructed quickly.",
    icon: Logs,
    title: "Correlated logs",
  },
] as const;

export default function OperationsPage() {
  return (
    <PageShell>
      <PageHero
        actions={
          <>
            <Button asChild size="lg">
              <a href="/metrics">
                Open /metrics
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/api/health">Open /api/health</a>
            </Button>
          </>
        }
        aside={
          <>
            <Card className="rounded-[2rem] border-border/70 bg-[linear-gradient(180deg,rgba(255,250,244,0.96),rgba(246,235,219,0.92))] shadow-[0_24px_70px_rgba(111,63,20,0.12)]">
              <CardHeader>
                <Badge className="w-fit" variant="secondary">
                  Local observability stack
                </Badge>
                <CardTitle className="text-2xl">Tempo and Grafana endpoints</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {localObservabilityEndpoints.map((endpoint) => (
                  <a
                    className="rounded-[1.4rem] border border-border/70 bg-background/78 px-4 py-4 transition-transform hover:-translate-y-0.5"
                    href={endpoint.url}
                    key={endpoint.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <p className="font-semibold tracking-tight">{endpoint.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {endpoint.url}
                    </p>
                  </a>
                ))}
              </CardContent>
            </Card>

            <div className="rounded-[2rem] border border-border/70 bg-stone-950 p-6 text-stone-100 shadow-[0_24px_70px_rgba(35,25,15,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/80">
                Expected span tree
              </p>
              <pre className="mt-4 overflow-x-auto text-sm leading-7 text-stone-200">
                <code>{traceExample}</code>
              </pre>
              <p className="mt-4 text-sm leading-6 text-stone-300">
                The request trace should stay readable: route span, service
                span, repository span, then database child spans with stable
                names.
              </p>
            </div>
          </>
        }
        badges={["Production runbook", "Grafana Tempo", "Prometheus metrics"]}
        description="This page is for the live system. Start with health, move to metrics, correlate logs, and only then drill into Tempo traces. The template already ships with the wiring, so the operator workflow stays simple."
        eyebrow="Operations"
        title="Operate the live system with health, metrics, logs, and traces."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationsHighlights.map((highlight) => {
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operatorRunbook.map((item) => (
          <article
            className="rounded-[1.8rem] border border-border/70 bg-card/84 p-6 shadow-[0_22px_60px_rgba(111,63,20,0.12)]"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              Runbook
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{item.label}</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {monitoringSignals.map((signal) => (
          <article
            className="rounded-[1.8rem] border border-border/70 bg-[linear-gradient(180deg,rgba(250,247,241,0.95),rgba(245,237,225,0.9))] p-6 shadow-[0_20px_54px_rgba(111,63,20,0.1)]"
            key={signal.title}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
                <ChartNoAxesCombined className="size-5" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">{signal.title}</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{signal.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          description="These defaults are already in the template and should remain part of the baseline as you add features."
          eyebrow="Signals"
          title="What good coverage looks like"
        >
          <ul className="grid gap-3">
            {observabilityChecklist.map((item) => (
              <li
                className="rounded-2xl border border-border/60 bg-background/65 px-4 py-3 text-sm leading-6 text-muted-foreground"
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          description="Ignore low-value traffic so Tempo keeps the spans that actually help during incident analysis."
          eyebrow="Tracing controls"
          title="Ignore-path example"
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-border/60 bg-background/65 p-4">
              <p className="text-sm font-semibold">OTEL_TRACE_IGNORE_PATHS</p>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-sm leading-7 text-stone-200">
                <code>{ignorePathsExample}</code>
              </pre>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep `/metrics`, static assets, and image optimizer requests out of
              the tracing pipeline unless you explicitly need them for a
              debugging session.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          description="These are the commands most useful when you are validating observability locally."
          eyebrow="Commands"
          title="Tempo and Grafana workflow"
        >
          <ul className="grid gap-3">
            {scripts
              .filter((script) =>
                [
                  "pnpm observability:up",
                  "pnpm observability:test",
                  "pnpm e2e",
                ].includes(script.name),
              )
              .map((script) => (
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
          description="Use this order during an incident so you move from coarse signal to precise signal without wasting time."
          eyebrow="Sequence"
          title="From symptom to span"
        >
          <div className="grid gap-3">
            {operatorRunbook.map((item) => (
              <div
                className="rounded-2xl border border-border/60 bg-background/65 px-4 py-3 text-sm leading-6 text-muted-foreground"
                key={item.label}
              >
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="mt-2">{item.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </PageShell>
  );
}
