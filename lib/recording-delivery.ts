import {randomBytes} from 'node:crypto';
import {digest} from './fireflies-core';
import {firefliesKey,submitRecording,submissionMessage,RetryableDeliveryError} from './fireflies';
import {prisma} from './prisma';
import {isMeetingLanguage} from './spoken-language';

const minute=60_000;
const retryDelays=[minute,5*minute,15*minute];

// Only statuses known not to have been accepted enter this queue.
// A lost reply is reconciled against Fireflies before any owner-requested resubmission.
export async function deliverRecording(id:string, origin:string){
 const now=new Date();
 const eligible={id,status:{in:['QUEUED','RETRY_WAIT']},nextDeliveryAt:{lte:now},reviewedAt:null,transcriptId:null,expiresAt:{gt:now},audio:{not:null}};
 const row=await prisma.meetingReport.findFirst({where:eligible,select:{userId:true,title:true,uploadLanguage:true,deliveryAttempts:true}});
 if(!row)return;
 const token=randomBytes(32).toString('base64url');
 const accessHash=digest(token);
 const claimed=await prisma.meetingReport.updateMany({where:{...eligible,deliveryAttempts:row.deliveryAttempts},data:{
  status:'UPLOADING',accessHash,lastRetriedAt:now,nextDeliveryAt:null,deliveryAttempts:{increment:1},error:null
 }});
 if(!claimed.count)return;
 const where={id,accessHash,status:'UPLOADING',transcriptId:null};
 let accepted=false;
 try{
  if(!isMeetingLanguage(row.uploadLanguage))throw new Error('Choose the spoken language before retrying the saved recording.');
  if(!origin||new URL(origin).protocol!=='https:')throw new Error('Configure the production HTTPS site URL before retrying.');
  const key=await firefliesKey(row.userId);
  const result=await submitRecording(key,new URL(origin).origin,id,row.title,token,row.uploadLanguage);
  accepted=result?.uploadAudio?.success===true;
  if(!accepted)throw new Error('Fireflies did not confirm acceptance. Check the Fireflies upload queue.');
 }catch(error){
  const cause=error instanceof Error ? (error.cause as {code?:string}|undefined)?.code : undefined;
  const definiteTransient=error instanceof RetryableDeliveryError||['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(cause||'');
  const delay=retryDelays[row.deliveryAttempts];
  if(definiteTransient && delay){
   await prisma.meetingReport.updateMany({where,data:{status:'RETRY_WAIT',nextDeliveryAt:new Date(Date.now()+delay),error:'Delivery was interrupted before acceptance. Meeting Studio will retry automatically.'}});
  }else{
   const message=error instanceof Error && /^(Connect your Fireflies|Choose the spoken|Configure the production)/.test(error.message)?error.message:submissionMessage(error);
   await prisma.meetingReport.updateMany({where,data:{status:'CHECK_REQUIRED',error:message}});
  }
  return;
 }
 // If this write fails, keep the ambiguous attempt for reconciliation. Never resend it here.
 await prisma.meetingReport.updateMany({where,data:{status:'PROCESSING',error:null}});
}

export async function maintainRecordingStates(){
 const now=Date.now();
 const since=(ms:number)=>new Date(now-ms);
 const oldActivity=(ms:number)=>({OR:[{lastRetriedAt:{lt:since(ms)}},{lastRetriedAt:null,createdAt:{lt:since(ms)}}]});
 const upload={reviewedAt:null,mimeType:{not:'application/x-google-meet'}};
 await prisma.meetingReport.updateMany({where:{...upload,status:'SAVING',createdAt:{lt:since(30*minute)}},data:{status:'INCOMPLETE',audio:null,error:'The file transfer was interrupted. Upload the same file again.'}});
 await prisma.meetingReport.updateMany({where:{...upload,status:{in:['QUEUED','RETRY_WAIT']},expiresAt:{lte:new Date(now)}},data:{status:'INCOMPLETE',audio:null,nextDeliveryAt:null,error:'The saved audio expired before delivery. Upload the same file again.'}});
 await prisma.meetingReport.updateMany({where:{...upload,status:'UPLOADING',transcriptId:null,...oldActivity(4*minute)},data:{status:'CHECK_REQUIRED',error:'The service restarted or the submission timed out. Meeting Studio is checking Fireflies. Check its upload queue before retrying.'}});
 await prisma.meetingReport.updateMany({where:{...upload,status:{in:['PROCESSING','SUMMARIZING']},...oldActivity(2*60*minute)},data:{status:'PROVIDER_DELAYED',error:'Fireflies is taking longer than expected. Meeting Studio is still checking. You can check the recording in Fireflies.'}});
 await prisma.meetingReport.updateMany({where:{...upload,status:{in:['PROVIDER_DELAYED','CHECK_REQUIRED']},...oldActivity(7*24*60*minute)},data:{status:'ACTION_REQUIRED',error:'Fireflies has not returned a finished report. Check the recording in Fireflies, then use Check progress to sync it.'}});
}
