import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { GalleryLoginForm } from "@/components/gallery-login-form";
import { hasGallerySession, isGalleryEnabled } from "@/server/auth/gallery-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function GalleryLoginPage() {
  if (await hasGallerySession()) {
    redirect("/gallery");
  }

  const enabled = isGalleryEnabled();

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-border bg-card p-8">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Lock className="size-4" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            The gallery is private
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {enabled
              ? "Enter the gallery password to see your images and videos."
              : "It is closed on this server until GALLERY_PASSWORD is set."}
          </p>
        </div>
        {enabled ? <GalleryLoginForm /> : null}
      </div>
    </main>
  );
}
