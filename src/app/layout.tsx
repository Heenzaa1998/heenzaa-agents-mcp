import type { Metadata } from "next";
import { Anuphan, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/content/site";
import { getDictionary } from "@/server/i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const anuphan = Anuphan({ subsets: ["thai", "latin"], variable: "--font-anuphan" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();

  return {
    title: {
      default: brand.name,
      template: `%s · ${brand.name}`,
    },
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dict } = await getDictionary();

  return (
    <html
      className={`${inter.variable} ${anuphan.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      lang={locale}
    >
      <body className="min-h-screen antialiased">
        <div aria-hidden="true" className="studio-backdrop">
          <div className="blob left-[-10%] top-[-18rem] size-[38rem] bg-[oklch(0.9_0.2_125/35%)]" />
          <div className="blob right-[-12%] top-[-10rem] size-[34rem] bg-[oklch(0.55_0.2_290/45%)] [animation-delay:-8s]" />
          <div className="blob left-[30%] top-[22rem] size-[30rem] bg-[oklch(0.7_0.14_200/22%)] [animation-delay:-14s]" />
          <div className="grid-lines" />
          <div className="grain" />
        </div>
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader labels={dict.nav} locale={locale} />
          <div className="flex-1">{children}</div>
          <SiteFooter tagline={dict.meta.description} />
        </div>
      </body>
    </html>
  );
}
