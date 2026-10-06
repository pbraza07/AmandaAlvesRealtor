import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { clean,rateLimit } from "@/lib/security";
import { sendLeadEmails } from "@/lib/email";
import { hasDatabase } from "@/lib/database";

const schema=z.object({
  type:z.enum(["BUYER","SELLER"]),
  idempotencyKey:z.string().min(10).max(100),
  firstName:z.string().min(1).max(80),
  lastName:z.string().min(1).max(80),
  email:z.email().max(180),
  phone:z.string().min(7).max(30),
  preferredContact:z.enum(["Call","Text","Email"]),
  bestTime:z.string().max(120).optional(),
  language:z.string().max(50),
  source:z.string().max(120).optional(),
  generalDetails:z.string().max(5000).optional(),
  consentPrivacy:z.literal(true),
  consentCallsTexts:z.boolean().optional(),
  website:z.string().max(0).optional()
}).passthrough();

export async function POST(req:NextRequest){
  const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown";
  if(!rateLimit(`lead:${ip}`,5,60*60*1000))return NextResponse.json({error:"Too many requests. Please try again later."},{status:429});
  try{
    const raw=await req.json();
    const parsed=schema.safeParse(raw);
    if(!parsed.success)return NextResponse.json({error:"Please review the required fields.",fields:parsed.error.flatten().fieldErrors},{status:400});
    const d=parsed.data;
    if(d.website)return NextResponse.json({ok:true,id:"accepted",storageMode:"email-only"});
    const shared=["type","idempotencyKey","firstName","lastName","email","phone","preferredContact","bestTime","language","source","consentPrivacy","consentCallsTexts","website"];
    const details=Object.fromEntries(Object.entries(d).filter(([k])=>!shared.includes(k)).map(([k,v])=>[clean(k,80),typeof v==="boolean"?v:clean(v,5000)]));
    const needed=d.type==="SELLER"&&String(details.needsBuyerHelp)==="Yes"?{areas:"To discuss",timeline:String(details.timeline||"To discuss"),source:"Linked to seller inquiry"}:undefined;
    const baseLead={
      id:`email-${Date.now()}`,
      type:d.type,
      firstName:clean(d.firstName,80),
      lastName:clean(d.lastName,80),
      email:d.email.toLowerCase(),
      phone:clean(d.phone,30),
      preferredContact:d.preferredContact,
      bestTime:clean(d.bestTime,120)||null,
      language:clean(d.language,50),
      source:clean(d.source,120)||null,
      details
    };

    if(!hasDatabase()){
      const delivery=await sendLeadEmails(baseLead);
      if(!delivery.adminSent)return NextResponse.json({error:"Your request could not be delivered by email. Please contact me directly and try again later."},{status:502});
      return NextResponse.json({ok:true,id:baseLead.id,storageMode:"email-only",autoResponseSent:delivery.clientSent},{status:201});
    }

    const {prisma}=await import("@/lib/prisma");
    const lead=await prisma.lead.upsert({
      where:{idempotencyKey:d.idempotencyKey},
      update:{},
      create:{
        type:d.type,
        idempotencyKey:d.idempotencyKey,
        firstName:baseLead.firstName,
        lastName:baseLead.lastName,
        email:baseLead.email,
        phone:baseLead.phone,
        preferredContact:baseLead.preferredContact,
        bestTime:baseLead.bestTime,
        language:baseLead.language,
        source:baseLead.source,
        details,
        linkedBuyerNeed:needed,
        consentPrivacy:true,
        consentCallsTexts:Boolean(d.consentCallsTexts),
        activities:{create:{action:"Lead submitted",detail:needed?"Seller inquiry with a linked buyer need":"Public website form"}}
      }
    });
    if(lead.createdAt.getTime()>Date.now()-10000)await sendLeadEmails(lead);
    return NextResponse.json({ok:true,id:lead.id,storageMode:"database"},{status:201});
  }catch(error){
    console.error("Lead submission failed",error);
    const configurationError=String(error).includes("EMAIL_NOT_CONFIGURED")||String(error).includes("EMAIL_FROM_NOT_CONFIGURED")||String(error).includes("LEAD_NOTIFICATION_EMAIL_NOT_CONFIGURED");
    return NextResponse.json({error:configurationError?"Email delivery is not configured yet. Please contact me directly.":"We couldn’t send your request just now. Please try again or contact me directly."},{status:configurationError?503:500});
  }
}
