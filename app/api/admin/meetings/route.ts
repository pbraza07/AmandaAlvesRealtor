import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {getAdmin,verifyOrigin,rateLimit} from '@/lib/security';
import {prisma} from '@/lib/prisma';
import {AUDIO_TTL_MS,MAX_AUDIO_BYTES,digest,mediaType,readBounded} from '@/lib/fireflies-core';
import {fireflies,firefliesKey,purgeExpiredAudio,reportSelect} from '@/lib/fireflies';
export const runtime='nodejs';
export async function GET(){const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});await purgeExpiredAudio();return NextResponse.json({meetings:await prisma.meetingReport.findMany({where:{userId:admin.id},select:reportSelect,orderBy:{createdAt:'desc'},take:100})},{headers:{'Cache-Control':'private, no-store'}})}
export async function POST(req:Request){
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
 let id:string|undefined;
 try{
  await verifyOrigin();if(!rateLimit(`ff-upload:${admin.id}`,5,60000))return NextResponse.json({error:'Please wait before uploading another recording.'},{status:429});
  const key=await firefliesKey(admin.id);await purgeExpiredAudio();
  const raw=await readBounded(req,MAX_AUDIO_BYTES+65536);const form=await new Response(new Uint8Array(raw),{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
  const file=form.get('file'),title=String(form.get('title')||'').trim().slice(0,180),language=String(form.get('language')||'');
  if(!(file instanceof File)||!file.size||file.size>MAX_AUDIO_BYTES)throw new Error('Choose an MP3, M4A, WAV, or OGG file up to 25 MB.');
  if(form.get('consent')!=='yes')throw new Error('Confirm you have permission to upload this recording.');
  if(!title)throw new Error('Add a meeting title.');if(!['','en','es','pt'].includes(language))throw new Error('Choose a supported language.');
  const bytes=Buffer.from(await file.arrayBuffer()),mime=mediaType(file.name,bytes);if(!mime)throw new Error('This file is not a supported audio recording.');
  const hash=digest(bytes);const duplicate=await prisma.meetingReport.findUnique({where:{userId_fileHash:{userId:admin.id,fileHash:hash}},select:reportSelect});if(duplicate)return NextResponse.json({meeting:duplicate,duplicate:true});
  const token=randomBytes(32).toString('base64url');
  // Serialize quota checks and creation across all instances, keeping temporary audio below 100 MB.
  const report=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(74230101)`;
   if(await tx.meetingReport.count({where:{audio:{not:null}}})>=4)throw new Error('Four recordings are processing. Wait for one to finish before uploading another.');
   return tx.meetingReport.create({data:{userId:admin.id,title,fileName:file.name.slice(0,240),fileHash:hash,mimeType:mime,audio:new Uint8Array(bytes),accessHash:digest(token),expiresAt:new Date(Date.now()+AUDIO_TTL_MS)}});
  });id=report.id;
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;const origin=new URL(base).origin;if(!origin.startsWith('https://'))throw new Error('Configure the production HTTPS site URL first.');
  const input={url:`${origin}/api/fireflies/audio/${id}`,title:`${title} [AA:${id}]`,client_reference_id:id,webhook:`${origin}/api/fireflies/callback/${id}?token=${token}`,download_auth:{type:'bearer_token',bearer:{token}},bypass_size_check:true,...(language?{custom_language:language}:{})};
  const data=await fireflies<{uploadAudio:{success:boolean}}>(key,'mutation($input: AudioUploadInput) { uploadAudio(input: $input) { success message } }',{input});
  if(!data.uploadAudio?.success)throw new Error('Fireflies did not accept the recording.');
  // A fast callback may have completed before the upload mutation returned.
  await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'PROCESSING'}});
  return NextResponse.json({meeting:await prisma.meetingReport.findUnique({where:{id},select:reportSelect})},{status:201});
 }catch(e){const message=e instanceof Error?e.message:'Upload failed';if(id)await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'CHECK_REQUIRED',error:'Submission could not be confirmed. Refresh this recording before uploading it again to avoid another transcription charge.'}});return NextResponse.json({error:message,meetingId:id},{status:400})}
}
