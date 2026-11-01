import { LifestylePage } from "@/components/LifestylePage";
import { getContent } from "@/lib/content";
export const revalidate=60;
export default async function Page(){return <LifestylePage content={await getContent()}/>}
