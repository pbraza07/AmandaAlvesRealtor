import { cookies } from "next/headers";
import { SiteLanguageProvider } from "@/components/SiteLanguage";
import { Localized } from "@/components/SiteLanguage";
import { translate, validLocale } from "@/lib/i18n/core";
import type { Metadata } from "next";
import Script from "next/script";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  const locale=validLocale((await cookies()).get("amanda-language")?.value);
  const t=(text:string)=>translate(text,locale);
  return { verification:{google:"4rvXDWSBPDue9k4RNlmgn06ptHQeUG54aiYZ03NRgp4"}, metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"https://amandaalvesrealtor.onrender.com"), title:t("Amanda Alves | Lifestyle Real Estate"), description:t("Find the property to fit your lifestyle in Florida. Explore lifestyle destinations in Spain, Portugal, and Costa Rica."), openGraph:{ title:t("Amanda Alves | Lifestyle Real Estate"), description:t("Find the property to fit your lifestyle in Florida. Explore lifestyle destinations in Spain, Portugal, and Costa Rica."), images:c.socialImageUrl ? [c.socialImageUrl] : [] }, robots:{ index:true, follow:true } };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale=validLocale((await cookies()).get("amanda-language")?.value);
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return <html lang={locale}><body><SiteLanguageProvider initialLocale={locale}><Localized><a href="#main" className="skip">Skip to main content</a></Localized>{children}{plausible && <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}</SiteLanguageProvider></body></html>;
}
