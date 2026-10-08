import type { Metadata } from "next";
import { BioPage } from "@/components/BioPage";
import { getContent } from "@/lib/content";

export const revalidate=60;
export async function generateMetadata():Promise<Metadata>{
 const c=await getContent();
 return {title:c.bioSeoTitle,description:c.bioSeoDescription,alternates:{canonical:"/bio"},openGraph:{title:c.bioSeoTitle,description:c.bioSeoDescription,images:[{url:c.bioImageUrl.startsWith("data:")?"/images/amanda-family-bio.webp":c.bioImageUrl||"/images/amanda-family-bio.webp",alt:c.bioImageAlt}]}};
}
export default async function Page(){return <BioPage content={await getContent()}/>;}
