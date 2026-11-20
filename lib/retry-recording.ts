import {randomBytes} from 'node:crypto';
import {prisma} from './prisma';
import {digest} from './fireflies-core';
import {firefliesKey,refreshMeeting,submitRecording,submissionMessage} from './fireflies';

// Called only for an explicitly requested retry. Routine status checks never upload audio.
export async function retrySavedRecording(id:string,userId:string,origin:string){
 if(new URL(origin).protocol!=='https:')throw new Error('Configure the production HTTPS site URL first.');
 const where={id,userId,status:'CHECK_REQUIRED',reviewedAt:null,transcriptId:null,audio:{not:null},expiresAt:{gt:new Date()}};
 const report=await prisma.meetingReport.findFirst({where,select:{title:true,accessHash:true,uploadLanguage:true,lastRetriedAt:true}});
 if(!report)throw new Error('This recording is no longer available to retry. Refresh its status.');
 if(report.lastRetriedAt&&report.lastRetriedAt.getTime()>Date.now()-10*60000)throw new Error('A retry was just attempted. Check the Fireflies queue before trying again.');
 const key=await firefliesKey(userId);
 if(await refreshMeeting(id,userId,true)!=='no-match')return;
 const token=randomBytes(32).toString('base64url');
 const accessHash=digest(token);
 const claim=await prisma.meetingReport.updateMany({where:{...where,expiresAt:{gt:new Date()},accessHash:report.accessHash,lastRetriedAt:report.lastRetriedAt},data:{status:'UPLOADING',accessHash,lastRetriedAt:new Date(),error:null}});
 if(!claim.count)return;
 const attempt={id,userId,status:'UPLOADING',accessHash,transcriptId:null};
 try{
  const data=await submitRecording(key,origin,id,report.title,token,report.uploadLanguage||'');
  if(!data.uploadAudio?.success)throw new Error('Fireflies did not accept the recording.');
  await prisma.meetingReport.updateMany({where:attempt,data:{status:'PROCESSING',error:null}});
 }catch(error){
  const message=submissionMessage(error);
  await prisma.meetingReport.updateMany({where:attempt,data:{status:'CHECK_REQUIRED',error:message}});
  throw new Error(message);
 }
}
