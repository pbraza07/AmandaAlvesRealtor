import { NextResponse } from "next/server";import { destroySession,verifyOrigin } from "@/lib/security";
export async function POST(){try{await verifyOrigin();await destroySession();return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Unable to sign out"},{status:400})}}
