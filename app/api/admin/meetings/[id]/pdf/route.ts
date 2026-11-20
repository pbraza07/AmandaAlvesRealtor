import {NextResponse} from 'next/server';
import {getAdmin} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {meetingPdf} from '@/lib/meeting-pdf';
export const runtime='nodejs';
export async function GET(req:Request,c:{params:Promise<{id:string}>}){const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});const {id}=await c.params;
 const url=new URL(req.url);
 if(url.searchParams.get('download')!=='1' && req.headers.get('accept')?.includes('text/html')){
  return NextResponse.redirect(new URL('/admin/meetings/'+encodeURIComponent(id)+'/report'+(url.searchParams.get('transcript')==='1'?'?transcript=1':''),url),{status:307,headers:{'Cache-Control':'private, no-store','Vary':'Accept'}});
 }
 const r=await prisma.meetingReport.findFirst({where:{id,userId:admin.id}});if(!r)return NextResponse.json({error:'Not found'},{status:404});if(r.status!=='READY')return NextResponse.json({error:'The report is still processing.'},{status:409});const bytes=await meetingPdf(r,new URL(req.url).searchParams.get('transcript')==='1');const name=r.title.normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'Meeting';return new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Amanda-Alves-${name}.pdf"`,'Cache-Control':'private, no-store'}})}
