import type { Metadata } from "next";
import { LifestylePage } from "@/components/LifestylePage";
import { getContent } from "@/lib/content";
export const revalidate=60;
export const metadata:Metadata={title:"Lifestyle Real Estate | Amanda Alves",description:"Find Your Place. Live Your Lifestyle. Explore Florida acreage, Spain, Portugal, and Costa Rica with Amanda Alves.",openGraph:{title:"Find Your Place. Live Your Lifestyle.",description:"From Florida acreage to international escapes, discover real estate opportunities designed around the life you want to live."}};
export default async function Page(){return <LifestylePage content={await getContent()}/>}
