import { HomePage } from "@/components/HomePage";
import { getContent } from "@/lib/content";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;
export default async function Page(){
 const content=await getContent(); let testimonials:Awaited<ReturnType<typeof prisma.testimonial.findMany>>=[];
 try{testimonials=await prisma.testimonial.findMany({where:{published:true},orderBy:{sortOrder:"asc"}})}catch{}
 return <HomePage content={content} testimonials={testimonials}/>;
}
