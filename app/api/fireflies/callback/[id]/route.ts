import {NextRequest,NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {accessMatches,readBounded} from '@/lib/fireflies-core';
import {refreshMeeting} from '@/lib/fireflies';
export const runtime='nodejs';
export async function POST(req:NextRequest,c:{params:Promise<{id:string}>}){
 const {id}=await c.params,token=req.nextUrl.searchParams.get('token')||'';const r=await prisma.meetingReport.findUnique({where:{id},select:{userId:true,accessHash:true,expiresAt:true,transcriptId:true}});
 if(!r||!accessMatches(token,r.accessHash)||r.expiresAt<new Date())return new NextResponse(null,{status:401});
 try{const b=JSON.parse((await readBounded(req,16000)).toString());const tid=b.meetingId;if(typeof tid!=='string'||tid.length>200)return NextResponse.json({error:'Invalid callback'},{status:400});
  if(r.transcriptId&&r.transcriptId!==tid)return NextResponse.json({error:'Transcript mismatch'},{status:409});
  // The per-upload callback is authenticated by a unique 256-bit token; the API read also checks the upload title.
  await prisma.meetingReport.updateMany({where:{id,transcriptId:null},data:{transcriptId:tid,status:'PROCESSING'}});
  await refreshMeeting(id,r.userId,true);return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Please retry delivery'},{status:503})}
}
