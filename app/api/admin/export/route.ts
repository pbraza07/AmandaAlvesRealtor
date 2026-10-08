import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { exportLeadsCsv } from "@/lib/lead-export";
export async function GET(){
 try {await requireAdmin();}catch{return NextResponse.json({error:"Unauthorized"},{status:401})}
 try {const leads=await prisma.lead.findMany({orderBy:{createdAt:"desc"}});return new NextResponse(exportLeadsCsv(leads),{headers:{"content-type":"text/csv; charset=utf-8","cache-control":"no-store","content-disposition":`attachment; filename="amanda-leads-${new Date().toISOString().slice(0,10)}.csv"`}})}catch{return NextResponse.json({error:"Unable to export leads. Please try again."},{status:500})}
}
