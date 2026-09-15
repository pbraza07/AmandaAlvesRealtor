import { NextRequest,NextResponse } from "next/server";
import { z } from "zod"; import { prisma } from "@/lib/prisma"; import { clean,rateLimit } from "@/lib/security"; import { sendLeadEmails } from "@/lib/email";
const schema=z.object({type:z.enum(["BUYER","SELLER"]),idempotencyKey:z.string().min(10).max(100),firstName:z.string().min(1).max(80),lastName:z.string().min(1).max(80),email:z.email().max(180),phone:z.string().min(7).max(30),preferredContact:z.enum(["Call","Text","Email"]),bestTime:z.string().max(120).optional(),language:z.string().max(50),source:z.string().max(120).optional(),generalDetails:z.string().max(5000).optional(),consentPrivacy:z.literal(true),consentCallsTexts:z.boolean().optional(),website:z.string().max(0).optional()}).passthrough();
export async function POST(req:NextRequest){
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown";if(!rateLimit(`lead:${ip}`,5,60*60*1000))return NextResponse.json({error:"Too many requests. Please try again later."},{status:429});
 try{const raw=await req.json();const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"Please review the required fields.",fields:parsed.error.flatten().fieldErrors},{status:400});const d=parsed.data;if(d.website)return NextResponse.json({ok:true});
 const shared=["type","idempotencyKey","firstName","lastName","email","phone","preferredContact","bestTime","language","source","consentPrivacy","consentCallsTexts","website"];
 const details=Object.fromEntries(Object.entries(d).filter(([k])=>!shared.includes(k)).map(([k,v])=>[clean(k,80),typeof v==="boolean"?v:clean(v,5000)]));
 const needed=d.type==="SELLER"&&String(details.needsBuyerHelp)==="Yes"?{areas:"To discuss",timeline:String(details.timeline||"To discuss"),source:"Linked to seller inquiry"}:undefined;
 const lead=await prisma.lead.upsert({where:{idempotencyKey:d.idempotencyKey},update:{},create:{type:d.type, idempotencyKey:d.idempotencyKey, firstName:clean(d.firstName,80),lastName:clean(d.lastName,80),email:d.email.toLowerCase(),phone:clean(d.phone,30),preferredContact:d.preferredContact,bestTime:clean(d.bestTime,120)||null,language:clean(d.language,50),source:clean(d.source,120)||null,details,linkedBuyerNeed:needed,consentPrivacy:true,consentCallsTexts:Boolean(d.consentCallsTexts),activities:{create:{action:"Lead submitted",detail:needed?"Seller inquiry with a linked buyer need":"Public website form"}}}});
 if(lead.createdAt.getTime()>Date.now()-10000)void sendLeadEmails(lead).catch(()=>{});
 return NextResponse.json({ok:true,id:lead.id},{status:201});
 }catch(e){console.error("Lead submission failed",e);return NextResponse.json({error:"We couldn’t send your request just now. Please try again or contact Amanda directly."},{status:500})}
}
