import { LifestylePage } from "@/components/LifestylePage";
import { getContent } from "@/lib/content";
import {getListingSettings} from '@/lib/listing-settings';
import {emptyListings} from '@/lib/listing-tour';
export const revalidate=60;
export default async function Page(){
 const [content,{settings}]=await Promise.all([getContent(),getListingSettings().catch(()=>({settings:emptyListings}))]);
 return <LifestylePage content={content} tours={settings.enabled?settings.tours:[]}/>;
}
