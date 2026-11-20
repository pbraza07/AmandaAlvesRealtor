import {randomBytes} from 'node:crypto';
import {prisma} from '../lib/prisma';
import {digest} from '../lib/fireflies-core';
import {firefliesKey,refreshMeeting,submitRecording} from '../lib/fireflies';

async function recover(id:string){
 const where={id,status:'CHECK_REQUIRED',transcriptId:null,audio:{not:null},expiresAt:{gt:new Date()}};
 const report=await prisma.meetingReport.findFirst({where,select:{userId:true,title:true}});
 if(!report)return;
 await refreshMeeting(id,report.userId,true);
 const key=await firefliesKey(report.userId);
 const token=randomBytes(32).toString('base64url');
 const claim=await prisma.meetingReport.updateMany({where,data:{status:'UPLOADING',accessHash:digest(token),error:null}});
 if(!claim.count)return;
 try{
  const data=await submitRecording(key,new URL(process.env.RENDER_EXTERNAL_URL||process.env.NEXT_PUBLIC_SITE_URL!).origin,id,report.title,token);
  if(!data.uploadAudio?.success)throw new Error('Fireflies did not confirm the upload.');
  await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'PROCESSING'}});
 }catch(error){
  await prisma.meetingReport.updateMany({where:{id,status:'UPLOADING'},data:{status:'CHECK_REQUIRED',error:error instanceof Error?error.message:'Check submission in Fireflies.'}});
 }
}
recover(process.argv[2]).catch(()=>{console.error('Meeting recovery check could not finish.');process.exitCode=1}).finally(()=>prisma.$disconnect());
