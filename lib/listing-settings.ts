import {prisma} from './prisma';
import {hasDatabase} from './database';
import {emptyListings,type ListingSettings} from './listing-tour';
export const listingKey='homepage-listing-tours';
export async function getListingSettings(){
 const row=hasDatabase()?await prisma.siteContent.findUnique({where:{id:listingKey}}):null;
 return {settings:row?row.content as unknown as ListingSettings:emptyListings,revision:row?.updatedAt.toISOString()||''};
}
