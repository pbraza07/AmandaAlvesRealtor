import { notFound } from "next/navigation";
import { CampaignLanding, type CampaignSlug } from "@/components/CampaignLanding";
import { getContent } from "@/lib/content";

// Must be server-owned: importing runtime values from a "use client" module
// into generateStaticParams is unsupported by the Next.js server build.
const campaignSlugs = ["sell", "buy", "acreage", "home-value", "openhouse"] as const;
export const revalidate = 60;
export function generateStaticParams() {
  return campaignSlugs.map((slug) => ({ slug }));
}
export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!campaignSlugs.some((candidate) => candidate === slug)) notFound();
  const content = await getContent();
  return <CampaignLanding slug={slug as CampaignSlug} content={content} />;
}
