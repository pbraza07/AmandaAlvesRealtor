import type { Metadata } from "next";
import { BioPage } from "@/components/BioPage";
import { getContent } from "@/lib/content";

export const revalidate=60;
export const metadata:Metadata={
 title:"Meet Amanda Alves | Tampa Bay Realtor & Investor",
 description:"Meet Amanda Alves, a Tampa Bay Realtor and investor passionate about acreage, lifestyle properties, and helping families build a life they love.",
 alternates:{canonical:"/bio"},
 openGraph:{title:"Meet Amanda Alves",description:"Personal guidance for homes, acreage, and lifestyle moves north of Tampa.",images:[{url:"/images/amanda-family-bio.webp",width:1280,height:1920,alt:"Amanda Alves with her family"}]}
};
export default async function Page(){return <BioPage content={await getContent()}/>;}
