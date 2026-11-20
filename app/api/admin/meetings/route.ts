import {detectRecordingLanguage,isMeetingLanguage} from '@/lib/spoken-language';
import {createHash,randomBytes} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {NextResponse} from 'next/server';
import {getAdmin,verifyOrigin,rateLimit} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {AUDIO_TTL_MS,MAX_AUDIO_BYTES,digest,mediaType} from '@/lib/fireflies-core';
import {submissionMessage,submitRecording,firefliesKey,purgeExpiredAudio,reportSelect} from '@/lib/fireflies';
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
  const file=form.get('file'),title=String(form.get('title')||'').trim().slice(0,180);
  const requestedLanguage=String(form.get('language')||'');
  if(!(file instanceof File)||!file.size||file.size>MAX_AUDIO_BYTES)throw new Error('Choose an MP3, M4A, MP4, WAV, or OGG file up to 60 MB.');
  if(form.get('consent')!=='yes')throw new Error('Confirm you have permission to upload this recording.');
  if(!title)throw new Error('Add a meeting title.');if(requestedLanguage && !isMeetingLanguage(requestedLanguage))throw new Error('Choose a supported language.');
  const mime=mediaType(file.name,new Uint8Array(await file.slice(0,12).arrayBuffer()));
  if(!mime)throw new Error('This file is not a supported audio recording.');
  const hasher=createHash('sha256');
  const partSize=512*1024;
  for(let offset=0;offset<file.size;offset+=partSize){
   hasher.update(new Uint8Array(await file.slice(offset,offset+partSize).arrayBuffer()));
  }
  const hash=hasher.digest('hex');
  const previous=await prisma.meetingReport.findUnique({where:{userId_fileHash:{userId:admin.id,fileHash:hash}},select:reportSelect});
  if(previous && previous.status!=='SAVING')return NextResponse.json({meeting:previous,duplicate:true});
  const language=requestedLanguage || await detectRecordingLanguage(file,mime);
  const token=randomBytes(32).toString('base64url');
  // Reserve one slot atomically. Binary transfers run after this short transaction commits.
  const reservation=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(74230101)`;
   await tx.meetingReport.deleteMany({where:{status:'SAVING',createdAt:{lt:new Date(Date.now()-30*60000)}}});
   const existing=await tx.meetingReport.findUnique({where:{userId_fileHash:{userId:admin.id,fileHash:hash}},select:reportSelect});
   if(existing)return {existing,id:existing.id};
   if(await tx.meetingReport.count({where:{audio:{not:null}}})>=4)throw new Error('Four recordings are processing. Wait for one to finish before uploading another.');
   const row=await tx.meetingReport.create({data:{userId:admin.id,title,fileName:file.name.slice(0,240),fileHash:hash,mimeType:mime,uploadLanguage:language,status:'SAVING',audio:Buffer.alloc(0),accessHash:digest(token),expiresAt:new Date(Date.now()+AUDIO_TTL_MS)},select:{id:true}});
   return {existing:null,id:row.id};
  },{maxWait:15000,timeout:30000});
  if(reservation.existing){
   if(reservation.existing.status==='SAVING')throw new Error('This recording is already being saved. Keep the first upload open.');
   return NextResponse.json({meeting:reservation.existing,duplicate:true});
  }
  const reportId=reservation.id;
  try{
   for(let offset=0;offset<file.size;offset+=partSize){
    const bytes=new Uint8Array(await file.slice(offset,offset+partSize).arrayBuffer());
    await prisma.recordingPart.create({data:{reportId,position:offset,bytes},select:{position:true}});
   }
   await prisma.meetingReport.update({where:{id:reportId,status:'SAVING'},data:{status:'UPLOADING'},select:{id:true}});
  }catch(error){
   await prisma.meetingReport.deleteMany({where:{id:reportId,status:'SAVING'}});
   throw error;
  }
  id=reportId;
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;const origin=new URL(base).origin;if(!origin.startsWith('https://'))throw new Error('Configure the production HTTPS site URL first.');
  const data=await submitRecording(key,origin,id,title,token,language);
  if(!data.uploadAudio?.success)throw new Error('Fireflies did not accept the recording.');
  // A fast callback may have completed before the upload mutation returned.
  await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'PROCESSING'}});
  return NextResponse.json({meeting:await prisma.meetingReport.findUnique({where:{id},select:reportSelect})},{status:201});
 }catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError)console.error('Meeting recording storage failure',{code:e.code,sqlState:e.meta?.code});
 const message=e instanceof Prisma.PrismaClientKnownRequestError ? (id?'Check this recording in Meeting Studio before submitting again.':'The recording could not be saved. Please retry the upload.') : e instanceof Error?e.message:'Upload failed';if(id)await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'CHECK_REQUIRED',error:submissionMessage(e)}});return NextResponse.json({error:message,meetingId:id},{status:400})}
}
