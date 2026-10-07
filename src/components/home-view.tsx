import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  Coins,
  Film,
  History,
  Hourglass,
  ImageIcon,
  ImageUp,
  KeyRound,
  Library,
  MessageSquareText,
  Plug,
  Route as RouteIcon,
  Sparkles,
  Vault,
} from "lucide-react";
import { EndpointUrl } from "@/components/endpoint-url";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/content/i18n";
import { models, showcase, toolNames, type ShowcaseImage, type ToolName } from "@/content/site";
import { cn } from "@/lib/utils";

const toolIcons: Record<ToolName, typeof ImageIcon> = {
  edit_image: Sparkles,
  generate_image: ImageIcon,
  generate_talking_video: AudioLines,
  generate_video: Film,
  get_costs: Coins,
  get_media_url: KeyRound,
  get_task_status: Hourglass,
  list_generations: History,
  list_references: Library,
  upload_reference: ImageUp,
};

// The featured card spans three rows with the next three tools stacked beside
// it; the rest sit three to a row.
const FEATURE_ROWS = 3;

const stepIcons = [MessageSquareText, RouteIcon, Sparkles, Vault];

function ShowcaseStack({ dict }: { dict: Dictionary["home"] }) {
  const [front, left, right] = showcase;

  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[4/5] w-full max-w-md lg:max-w-none">
      {left ? (
        <div className="absolute left-0 top-[12%] w-[46%] -rotate-[8deg] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60">
          <Image alt="" className="h-auto w-full" height={left.height} sizes="240px" src={left.src} width={left.width} />
        </div>
      ) : null}
      {right ? (
        <div className="absolute right-0 top-[4%] w-[46%] rotate-[7deg] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60">
          <Image alt="" className="h-auto w-full" height={right.height} sizes="240px" src={right.src} width={right.width} />
        </div>
      ) : null}
      {front ? (
        <div className="absolute left-1/2 top-[18%] w-[60%] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
          <Image
            alt=""
            className="h-auto w-full"
            height={front.height}
            priority
            sizes="(min-width: 1024px) 320px, 60vw"
            src={front.src}
            width={front.width}
          />
        </div>
      ) : null}

      <div className="glass animate-float absolute left-[2%] top-[62%] flex max-w-[70%] items-center gap-2 rounded-xl px-3 py-2 font-mono text-[11px] shadow-xl">
        <span className="text-primary">generate_image</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Check className="size-3 text-primary" />
          {dict.heroToolDone}
        </span>
      </div>
      {front ? (
        <div className="glass animate-float absolute bottom-[4%] right-[2%] max-w-[78%] rounded-xl px-3.5 py-2.5 text-xs leading-5 text-foreground/90 shadow-xl [animation-delay:-3s]">
          <span className="line-clamp-2">“{front.prompt}”</span>
          <span className="mt-1 flex items-center gap-1 font-mono text-[10px] text-primary">
            <Vault className="size-3" />
            {dict.heroSaved}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Marquee({ images, label }: { images: readonly ShowcaseImage[]; label: string }) {
  if (images.length === 0) {
    return null;
  }

  return (
    <section aria-label={label} className="flex flex-col gap-5">
      <p className="eyebrow px-4 text-center text-muted-foreground">
        {label}
      </p>
      <div className="fade-edges overflow-hidden">
        <div className="animate-marquee flex w-max gap-4 hover:[animation-play-state:paused]">
          {[...images, ...images].map((image, index) => (
            <div
              className="h-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:h-64"
              key={`${image.src}-${index}`}
            >
              <Image
                alt={index < images.length ? image.prompt : ""}
                className="h-full w-auto"
                height={image.height}
                sizes="400px"
                src={image.src}
                width={image.width}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-primary">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
        {title}
      </h2>
    </div>
  );
}

export function HomeView({ dict }: { dict: Dictionary }) {
  const home = dict.home;
  const featured = showcase[3] ?? showcase[0];

  return (
    <main className="flex flex-col gap-28 pb-12 pt-12 lg:gap-36 lg:pt-20">
      <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="flex flex-col gap-7">
          <span className="glass flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {home.badge}
          </span>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            <span className="block">{home.titleLead}</span>{" "}
            <span className="text-gradient block pb-1">{home.titleAccent}</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">{home.intro}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="shadow-[0_0_40px_-8px_var(--primary)]" size="lg">
              <Link href="/gallery">
                {home.openGallery}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild className="glass" size="lg" variant="outline">
              <a href="#connect">
                <Plug />
                {home.connect}
              </a>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-2 pt-2">
            {models.map((model) => (
              <li
                className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-muted-foreground"
                key={model}
              >
                {model}
              </li>
            ))}
          </ul>
        </div>
        <ShowcaseStack dict={home} />
      </section>

      <Marquee images={showcase} label={home.madeHere} />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:px-8" id="tools">
        <SectionHeading eyebrow={home.toolsEyebrow} title={home.toolsTitle(toolNames.length)} />
        <div className="grid gap-4 md:grid-cols-6">
          {toolNames.map((name, index) => {
            const tool = home.tools[name];
            const Icon = toolIcons[name];
            const isFeature = index === 0;

            return (
              <div
                className={cn(
                  "group relative flex flex-col justify-end gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/70 p-6 transition-colors hover:border-primary/40",
                  isFeature && "min-h-80 md:col-span-3 md:row-span-3",
                  index > 0 && index <= FEATURE_ROWS && "md:col-span-3",
                  index > FEATURE_ROWS && "md:col-span-2",
                )}
                key={name}
              >
                {isFeature && featured ? (
                  <>
                    <Image
                      alt=""
                      className="absolute inset-0 size-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      src={featured.src}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                  </>
                ) : null}
                <div className="relative flex flex-col gap-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-white/[0.06] text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    {tool.medium}
                  </span>
                  <code className={cn("text-foreground", isFeature ? "text-lg" : "text-sm")}>{name}</code>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">{tool.summary}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={home.stepsEyebrow} title={home.stepsTitle} />
        <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div
            aria-hidden="true"
            className="absolute left-6 right-6 top-6 hidden h-px bg-gradient-to-r from-primary/70 via-white/15 to-transparent lg:block"
          />
          {home.steps.map((step, index) => {
            const Icon = stepIcons[index] ?? Sparkles;

            return (
              <li className="relative flex flex-col gap-4" key={step.title}>
                <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-card text-primary shadow-[0_0_30px_-10px_var(--primary)]">
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{step.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8" id="connect">
        <div className="relative grid gap-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-card/70 p-6 sm:p-12 lg:grid-cols-2">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-80 rounded-full bg-primary/20 blur-[100px]"
          />
          <div className="relative flex flex-col gap-6">
            <SectionHeading eyebrow={home.connectEyebrow} title={home.connectTitle} />
            <ol className="flex flex-col gap-4">
              {home.connectSteps.map((step, index) => (
                <li className="flex gap-3 text-sm leading-6 text-muted-foreground" key={step}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="relative self-center overflow-hidden rounded-2xl border border-white/10 bg-background/80 font-mono text-xs shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-2 text-[11px] text-muted-foreground">claude.ai · custom connector</span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="text-muted-foreground">{home.urlLabel}</span>
                <EndpointUrl copyLabel={home.copyEndpoint} />
              </div>
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="text-muted-foreground">{home.headerLabel}</span>
                <code className="break-all text-foreground">
                  Authorization: Bearer <span className="text-primary">&lt;MCP_AUTH_TOKEN&gt;</span>
                </code>
              </div>
              <p className="border-t border-white/[0.06] pt-4 font-sans text-xs leading-5 text-muted-foreground">
                {home.tokenNote}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
