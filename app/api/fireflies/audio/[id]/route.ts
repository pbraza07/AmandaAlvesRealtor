import {NextRequest,NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {accessMatches} from '@/lib/fireflies-core';
export const runtime='nodejs';
async function serve(req:NextRequest,context:{params:Promise<{id:string}>},head=false){const {id}=await context.params;const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(!token)return new NextResponse(null,{status:401});const r=await prisma.meetingReport.findUnique({where:{id}});if(!r||!r.audio||r.expiresAt<new Date()||!accessMatches(token,r.accessHash))return new NextResponse(null,{status:404});return new NextResponse(head?null:new Uint8Array(r.audio),{headers:{'Content-Type':r.mimeType,'Content-Length':String(r.audio.length),'Cache-Control':'private, no-store','Content-Disposition':'attachment'}})}
export const GET=(req:NextRequest,c:{params:Promise<{id:string}>})=>serve(req,c);
export const HEAD=(req:NextRequest,c:{params:Promise<{id:string}>})=>serve(req,c,true);
