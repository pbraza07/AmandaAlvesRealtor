import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return { title:c.seoTitle, description:c.seoDescription, openGraph:{ title:c.seoTitle, description:c.seoDescription, images:c.socialImageUrl ? [c.socialImageUrl] : [] }, robots:{ index:true, follow:true } };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return <html lang="en"><body><a href="#main" className="skip">Skip to main content</a>{children}{plausible && <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}</body></html>;
}
