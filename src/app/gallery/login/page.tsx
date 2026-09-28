import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GalleryLoginForm } from "@/components/gallery-login-form";
import { PageShell } from "@/components/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasGallerySession, isGalleryEnabled } from "@/server/auth/gallery-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery sign in",
  robots: { index: false, follow: false },
};

export default async function GalleryLoginPage() {
  if (await hasGallerySession()) {
    redirect("/gallery");
  }

  return (
    <PageShell className="items-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Private gallery</CardTitle>
          <CardDescription>
            {isGalleryEnabled()
              ? "Enter the gallery password to see your generated images and videos."
              : "The gallery is closed: GALLERY_PASSWORD is not set on this server."}
          </CardDescription>
        </CardHeader>
        {isGalleryEnabled() ? (
          <CardContent>
            <GalleryLoginForm />
          </CardContent>
        ) : null}
      </Card>
    </PageShell>
  );
}
