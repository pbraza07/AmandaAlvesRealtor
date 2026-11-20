import {randomBytes} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {NextResponse} from 'next/server';
import {getAdmin,verifyOrigin,rateLimit} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {AUDIO_TTL_MS,MAX_AUDIO_BYTES,digest,mediaType} from '@/lib/fireflies-core';
import {submitRecording,firefliesKey,purgeExpiredAudio,reportSelect} from '@/lib/fireflies';
export const runtime='nodejs';
export async function GET(){const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});await purgeExpiredAudio();return NextResponse.json({meetings:await prisma.meetingReport.findMany({where:{userId:admin.id},select:reportSelect,orderBy:{createdAt:'desc'},take:100})},{headers:{'Cache-Control':'private, no-store'}})}
export async function POST(req:Request){
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
 let id:string|undefined;
 try{
  await verifyOrigin();if(!rateLimit(`ff-upload:${admin.id}`,5,60000))return NextResponse.json({error:'Please wait before uploading another recording.'},{status:429});
  const key=await firefliesKey(admin.id);await purgeExpiredAudio();
  const limit=MAX_AUDIO_BYTES+65536;
  if(!req.body || Number(req.headers.get('content-length'))>limit)throw new Error('Choose an audio file up to 60 MB.');
  let received=0;
  const body=req.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){
   received+=chunk.byteLength;
   if(received>limit)throw new Error('Choose an audio file up to 60 MB.');
   controller.enqueue(chunk);
  }}));
  const form=await new Response(body,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
  const file=form.get('file'),title=String(form.get('title')||'').trim().slice(0,180),language=String(form.get('language')||'');
  if(!(file instanceof File)||!file.size||file.size>MAX_AUDIO_BYTES)throw new Error('Choose an MP3, M4A, MP4, WAV, or OGG file up to 60 MB.');
  if(form.get('consent')!=='yes')throw new Error('Confirm you have permission to upload this recording.');
  if(!title)throw new Error('Add a meeting title.');if(!['','en','es','pt'].includes(language))throw new Error('Choose a supported language.');
  const bytes=Buffer.from(await file.arrayBuffer()),mime=mediaType(file.name,bytes);if(!mime)throw new Error('This file is not a supported audio recording.');
  const hash=digest(bytes);const duplicate=await prisma.meetingReport.findUnique({where:{userId_fileHash:{userId:admin.id,fileHash:hash}},select:reportSelect});if(duplicate)return NextResponse.json({meeting:duplicate,duplicate:true});
  const token=randomBytes(32).toString('base64url');
  // Serialize quota checks and creation across all instances, keeping temporary audio below 240 MB.
  const report=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(74230101)`;
   if(await tx.meetingReport.count({where:{audio:{not:null}}})>=4)throw new Error('Four recordings are processing. Wait for one to finish before uploading another.');
   const saved=await tx.meetingReport.create({data:{userId:admin.id,title,fileName:file.name.slice(0,240),fileHash:hash,mimeType:mime,audio:Buffer.alloc(0),accessHash:digest(token),expiresAt:new Date(Date.now()+AUDIO_TTL_MS)},select:{id:true}});
   // Keep each Prisma binary parameter small, including on memory-limited hosting.
   const chunkSize=4*1024*1024;
   for(let offset=0;offset<bytes.length;offset+=chunkSize){
    await tx.$executeRaw`UPDATE "MeetingReport" SET audio = audio || ${bytes.subarray(offset,offset+chunkSize)}::bytea WHERE id = ${saved.id}`;
   }
   return saved;
  }, {maxWait:15000, timeout:180000});
  id=report.id;
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;const origin=new URL(base).origin;if(!origin.startsWith('https://'))throw new Error('Configure the production HTTPS site URL first.');
  const data=await submitRecording(key,origin,id,title,token,language);
  if(!data.uploadAudio?.success)throw new Error('Fireflies did not accept the recording.');
  // A fast callback may have completed before the upload mutation returned.
  await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'PROCESSING'}});
  return NextResponse.json({meeting:await prisma.meetingReport.findUnique({where:{id},select:reportSelect})},{status:201});
 }catch(e){const message=e instanceof Prisma.PrismaClientKnownRequestError ? (id?'Check this recording in Meeting Studio before submitting again.':'The recording could not be saved. Please retry the upload.') : e instanceof Error?e.message:'Upload failed';if(id)await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'CHECK_REQUIRED',error:'Submission could not be confirmed. Refresh this recording before uploading it again to avoid another transcription charge.'}});return NextResponse.json({error:message,meetingId:id},{status:400})}
}
