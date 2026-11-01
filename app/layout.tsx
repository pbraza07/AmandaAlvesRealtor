import type { Metadata } from "next";
import Script from "next/script";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return { metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"), title:"Amanda Alves | Lifestyle Real Estate", description:"Find the property to fit your lifestyle in Florida. Explore lifestyle destinations in Spain, Portugal, and Costa Rica.", openGraph:{ title:"Amanda Alves | Lifestyle Real Estate", description:"Find the property to fit your lifestyle in Florida. Explore lifestyle destinations in Spain, Portugal, and Costa Rica.", images:c.socialImageUrl ? [c.socialImageUrl] : [] }, robots:{ index:true, follow:true } };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return <html lang="en"><body><a href="#main" className="skip">Skip to main content</a>{children}{plausible && <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}</body></html>;
}
