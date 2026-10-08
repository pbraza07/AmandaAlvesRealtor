import { notFound } from "next/navigation";
import { CampaignLanding, campaignSlugs, type CampaignSlug } from "@/components/CampaignLanding";
import { getContent } from "@/lib/content";
export const revalidate=60;
export function generateStaticParams(){return campaignSlugs.map(slug=>({slug}));}
export default async function CampaignPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;if(!campaignSlugs.includes(slug as CampaignSlug))notFound();
 const content=await getContent();return <CampaignLanding slug={slug as CampaignSlug} content={content}/>;
}
