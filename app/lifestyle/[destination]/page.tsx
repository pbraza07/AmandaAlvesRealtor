import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LifestylePage } from "@/components/LifestylePage";
import { getContent } from "@/lib/content";
import { destinations } from "@/lib/lifestyle";
export const revalidate=60;
export function generateStaticParams(){return destinations.map(d=>({destination:d.slug}))}
export async function generateMetadata({params}:{params:Promise<{destination:string}>}):Promise<Metadata>{const {destination}=await params;const d=destinations.find(d=>d.slug===destination);return d?{title:`${d.name} Lifestyle Real Estate | Amanda Alves`,description:d.description,openGraph:{title:`${d.name} | Find Your Place. Live Your Lifestyle.`,description:d.description,images:[d.image]}}:{}}
export default async function Page({params}:{params:Promise<{destination:string}>}){const {destination}=await params;const d=destinations.find(d=>d.slug===destination);if(!d)notFound();return <LifestylePage content={await getContent()} destination={d}/>}
