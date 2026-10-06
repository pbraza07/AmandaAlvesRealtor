import { HomePage } from "@/components/HomePage";
import { getContent } from "@/lib/content";
import { hasDatabase } from "@/lib/database";

export const revalidate = 60;
export default async function Page(){
 const content=await getContent(); let testimonials:Array<{id:string;quote:string;name:string;context:string|null}>=[];
 if(hasDatabase())try{const {prisma}=await import("@/lib/prisma");testimonials=await prisma.testimonial.findMany({where:{published:true},orderBy:{sortOrder:"asc"}})}catch{}
 return <HomePage content={content} testimonials={testimonials}/>;
}
