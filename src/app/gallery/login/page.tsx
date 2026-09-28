import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { GalleryLoginForm } from "@/components/gallery-login-form";
import { showcase } from "@/content/site";
import { hasGallerySession, isGalleryEnabled } from "@/server/auth/gallery-session";
import { getDictionary } from "@/server/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();

  return { title: dict.login.title, robots: { index: false, follow: false } };
}

export default async function GalleryLoginPage() {
  if (await hasGallerySession()) {
    redirect("/gallery");
  }

  const { dict } = await getDictionary();
  const text = dict.login;
  const enabled = isGalleryEnabled();

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div
        aria-hidden="true"
        className="hidden max-h-[calc(100vh-10rem)] columns-2 gap-3 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)] lg:block [&>*]:mb-3"
      >
        {showcase.map((image, index) => (
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.08] opacity-80"
            key={image.src}
            style={{ transform: `translateY(${index % 2 === 0 ? 0 : 24}px)` }}
          >
            <Image alt="" className="h-auto w-full" height={image.height} sizes="300px" src={image.src} width={image.width} />
          </div>
        ))}
      </div>

      <div className="glass mx-auto flex w-full max-w-md flex-col gap-7 rounded-3xl p-8 sm:p-10">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_40px_-8px_var(--primary)]">
          <Lock className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">{text.title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {enabled ? text.body : text.closed}
          </p>
        </div>
        {enabled ? <GalleryLoginForm text={text} /> : null}
      </div>
    </main>
  );
}
