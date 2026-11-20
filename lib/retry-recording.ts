import {isMeetingLanguage} from './spoken-language';
import {prisma} from './prisma';
import {refreshMeeting} from './fireflies';

// Called only for an explicitly requested retry. Routine status checks never upload audio.
export async function retrySavedRecording(id:string,userId:string,origin:string,requestedLanguage?:unknown){
 if(new URL(origin).protocol!=='https:')throw new Error('Configure the production HTTPS site URL first.');
 const where={id,userId,status:'CHECK_REQUIRED',reviewedAt:null,transcriptId:null,audio:{not:null},expiresAt:{gt:new Date()}};
 const report=await prisma.meetingReport.findFirst({where,select:{title:true,accessHash:true,uploadLanguage:true,lastRetriedAt:true}});
 if(!report)throw new Error('This recording is no longer available to retry. Refresh its status.');
 if(report.lastRetriedAt&&report.lastRetriedAt.getTime()>Date.now()-10*60000)throw new Error('A retry was just attempted. Check the Fireflies queue before trying again.');
 if(await refreshMeeting(id,userId,true)!=='no-match')return;
 const language=report.uploadLanguage||requestedLanguage;
 if(!isMeetingLanguage(language))throw new Error('Choose the spoken language for this saved recording before retrying.');
 await prisma.meetingReport.updateMany({
  where:{...where,expiresAt:{gt:new Date()},accessHash:report.accessHash,lastRetriedAt:report.lastRetriedAt},
  data:{status:'QUEUED',uploadLanguage:language,nextDeliveryAt:new Date(),deliveryAttempts:0,error:null}
 });
}
