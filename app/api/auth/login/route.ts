import { NextRequest,NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession,rateLimit,verifyOrigin } from "@/lib/security";
import { hasDatabase } from "@/lib/database";

export async function POST(req:NextRequest){
  if(!hasDatabase())return NextResponse.json({error:"The private dashboard requires PostgreSQL. The public website is running in email-only mode."},{status:503});
  try{
    await verifyOrigin();
    const ip=req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown";
    if(!rateLimit(`login:${ip}`,8,15*60*1000))return NextResponse.json({error:"Too many attempts. Try again later."},{status:429});
    const {email,password}=await req.json();
    const {prisma}=await import("@/lib/prisma");
    const user=await prisma.adminUser.findUnique({where:{email:String(email).toLowerCase().trim()}});
    if(!user||!await bcrypt.compare(String(password),user.passwordHash))return NextResponse.json({error:"Email or password is incorrect."},{status:401});
    await createSession(user.id);
    await prisma.session.deleteMany({where:{expiresAt:{lt:new Date()}}});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Unable to sign in."},{status:400})}
}
