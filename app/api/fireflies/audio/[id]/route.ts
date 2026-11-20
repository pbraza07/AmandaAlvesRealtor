import {NextRequest,NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {accessMatches} from '@/lib/fireflies-core';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
async function serve(req:NextRequest,context:Context,head=false){
 const {id}=await context.params;
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!token)return new NextResponse(null,{status:401});
 const [record]=await prisma.$queryRaw<{accessHash:string;mimeType:string;length:number;parts:boolean}[]>`
   SELECT "accessHash","mimeType",octet_length(audio)=0 AS parts,
    CASE WHEN octet_length(audio)>0 THEN octet_length(audio) ELSE
     (SELECT coalesce(sum(octet_length(bytes)),0)::int FROM "RecordingPart" WHERE "reportId"=${id}) END AS length FROM "MeetingReport"
   WHERE id=${id} AND audio IS NOT NULL AND status<>'SAVING' AND "expiresAt">NOW()`;
 if(!record?.length||!accessMatches(token,record.accessHash))return new NextResponse(null,{status:404});
 let offset=0;
 const body=head?null:new ReadableStream<Uint8Array>({
  async pull(controller){
   const [part]=record.parts?await prisma.$queryRaw<{bytes:Uint8Array}[]>`SELECT bytes FROM "RecordingPart" WHERE "reportId"=${id} AND position=${offset}::int`:await prisma.$queryRaw<{bytes:Uint8Array}[]>`
     SELECT substring(audio FROM ${offset+1}::int FOR 2097152) AS bytes
     FROM "MeetingReport" WHERE id=${id} AND audio IS NOT NULL`;
   if(!part?.bytes.length)throw new Error('Audio download interrupted.');
   controller.enqueue(part.bytes);
   offset+=part.bytes.length;
   if(offset>=record.length)controller.close();
  }
 });
 return new NextResponse(body,{headers:{'Content-Type':record.mimeType,'Content-Length':String(record.length),'Cache-Control':'private, no-store','Content-Disposition':'attachment'}});
}
export const GET=(req:NextRequest,c:Context)=>serve(req,c);
export const HEAD=(req:NextRequest,c:Context)=>serve(req,c,true);
