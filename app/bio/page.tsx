import { cookies } from "next/headers";
import { translate,validLocale } from "@/lib/i18n/core";
import type { Metadata } from "next";
import { BioPage } from "@/components/BioPage";
import { getContent } from "@/lib/content";

export const revalidate=60;
export async function generateMetadata():Promise<Metadata>{
 const c=await getContent();
 const locale=validLocale((await cookies()).get("amanda-language")?.value);const t=(text:string)=>translate(text,locale);
 return {title:t(c.bioSeoTitle),description:t(c.bioSeoDescription),alternates:{canonical:"/bio"},openGraph:{title:t(c.bioSeoTitle),description:t(c.bioSeoDescription),images:[{url:c.bioImageUrl.startsWith("data:")?"/images/amanda-family-bio.webp":c.bioImageUrl||"/images/amanda-family-bio.webp",alt:t(c.bioImageAlt)}]}};
}
export default async function Page(){return <BioPage content={await getContent()}/>;}
