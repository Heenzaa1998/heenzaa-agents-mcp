import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Boxes, Cable, Command, FolderTree } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  architectureLayers,
  bootstrapSteps,
  deploymentChecklist,
  liveRoutes,
  operatingPrinciples,
  requestJourney,
  scripts,
} from "@/content/site";

export const metadata: Metadata = {
  title: "Guide",
};

const guideHighlights = [
  {
    description: "See the exact pages and runtime routes you can hand to teammates once the app is deployed.",
    icon: BookOpenText,
    title: "Clear entry points",
  },
  {
    description: "Use a short pnpm command surface for local dev, smoke tests, migrations, and observability checks.",
    icon: Command,
    title: "Small command surface",
  },
  {
    description: "Keep extension work predictable by growing features inside a stable folder layout.",
    icon: FolderTree,
    title: "Shallow structure",
  },
  {
    description: "Trace continuity survives from the route adapter down to the Drizzle query layer.",
    icon: Cable,
    title: "Complete request flow",
  },
] as const;

export default function GuidePage() {
  return (
    <PageShell>
      <PageHero
        actions={
          <>
            <Button asChild size="lg">
              <Link href={"/operations" as Route}>
                Open operations
                <ArrowUpRight className="size-4" />
              </Link>
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
                  First 15 minutes
                </Badge>
                <CardTitle className="text-2xl">What to do first on a fresh environment</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {bootstrapSteps.map((step, index) => (
                  <div
                    className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-[1.4rem] border border-border/70 bg-background/80 p-4"
                    key={step}
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6 text-muted-foreground">{step}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-card/90 shadow-[0_24px_70px_rgba(111,63,20,0.12)]">
              <CardHeader>
                <Badge className="w-fit">Deploy checklist</Badge>
                <CardTitle className="text-2xl">Things to decide before traffic arrives</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {deploymentChecklist.slice(0, 4).map((item) => (
                  <div
                    className="rounded-[1.4rem] border border-border/70 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        }
        badges={["Usage guide", "pnpm workflow", "App Router + Drizzle"]}
        description="This page is the hand-off surface for developers and product teams. It explains which routes matter, which commands are worth memorizing, and where to extend the project without turning the codebase into ceremony."
        eyebrow="Guide"
        title="Use the project confidently once the app is live."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {guideHighlights.map((highlight) => {
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

      <section className="grid gap-4 lg:grid-cols-2">
        {liveRoutes.map((route) => (
          <article
            className="rounded-[1.8rem] border border-border/70 bg-card/84 p-6 shadow-[0_22px_60px_rgba(111,63,20,0.12)]"
            key={`${route.method}-${route.path}`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{route.method}</Badge>
              <code className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {route.path}
              </code>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                {route.audience}
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold tracking-tight">{route.summary}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          description="You can add features without pulling business logic into route files."
          eyebrow="Layout"
          title="Project structure"
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
          description="These rules keep the project production-ready without pushing it into enterprise ceremony."
          eyebrow="Principles"
          title="How to extend it safely"
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
          description="These are the commands worth learning if you use the repo every day."
          eyebrow="Commands"
          title="Daily workflow"
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
          description="The sample subscriber feature is the reference path for new domain features."
          eyebrow="Request path"
          title="What happens during a request"
        >
          <div className="grid gap-3">
            {requestJourney.map((item) => (
              <div
                className="grid gap-2 rounded-2xl border border-border/60 bg-background/65 px-4 py-3"
                key={item.step}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Boxes className="size-4" />
                  </div>
                  <p className="font-semibold tracking-tight">{item.step}</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </PageShell>
  );
}
