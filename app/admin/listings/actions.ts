'use server';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {Prisma} from '@prisma/client';
import {getAdmin,verifyOrigin} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {listingKey} from '@/lib/listing-settings';
import {autoplaySource,videoSource,type ListingSettings} from '@/lib/listing-tour';

const tour=z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(160),description:z.string().trim().max(1000),url:z.string().trim().max(4096).refine(v=>!!videoSource(v)),embed:z.boolean().optional(),autoplayUrl:z.string().trim().max(4096).refine(v=>!v||!!autoplaySource(v)).optional()});
export async function saveListings(input:ListingSettings,revision:string){
 if(!await getAdmin())throw new Error('Sign in to save listings.');
 await verifyOrigin();
 const parsed=z.object({enabled:z.boolean(),tours:z.array(tour)}).safeParse(input);
 if(!parsed.success||parsed.data.enabled&&!parsed.data.tours.length)throw new Error('Add a listing title and HTTPS video link before publishing.');
 const data={content:parsed.data,updatedAt:new Date()};
 const conflict='Another owner saved changes. Refresh before editing again.';
 if(revision){
   const result=await prisma.siteContent.updateMany({where:{id:listingKey,updatedAt:new Date(revision)},data});
   if(!result.count)throw new Error(conflict);
 }else{
   try{await prisma.siteContent.create({data:{id:listingKey,...data}})}
   catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')throw new Error(conflict);throw error}
 }
 revalidatePath('/');revalidatePath('/admin/listings');
 return data.updatedAt.toISOString();
}
