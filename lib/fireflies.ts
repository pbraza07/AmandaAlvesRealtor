import {prisma} from './prisma';
import {decryptKey,reportFields,hasSummary,type FirefliesTranscript} from './fireflies-core';
export async function firefliesKey(userId:string){if(process.env.FIREFLIES_API_KEY)return process.env.FIREFLIES_API_KEY;const connection=await prisma.firefliesConnection.findUnique({where:{userId}});if(!connection)throw new Error('Connect your Fireflies account first.');return decryptKey(connection.encryptedKey,process.env.FIREFLIES_ENCRYPTION_KEY||'')}
export async function fireflies<T>(key:string,query:string,variables:Record<string,unknown>={}){
 const r=await fetch('https://api.fireflies.ai/graphql',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(18000),cache:'no-store'});
 if(!r.ok)throw new Error(r.status===429?'Fireflies rate limit reached. Wait a minute and refresh.':r.status===401?'Fireflies rejected the API key. Reconnect your account.':'Fireflies is temporarily unavailable. Try refreshing later.');
 const body=await r.json();if(body.errors?.length)throw new Error('Fireflies could not complete this request. Check your account credits, API permissions, and upload allowance.');return body.data as T;
}
export async function purgeExpiredAudio(){await prisma.meetingReport.updateMany({where:{expiresAt:{lt:new Date()},audio:{not:null}},data:{audio:null}})}
export const reportSelect={id:true,title:true,fileName:true,status:true,transcriptId:true,overview:true,agenda:true,notes:true,actionItems:true,reviewedAt:true,createdAt:true,updatedAt:true,error:true} as const;
export async function refreshMeeting(id:string,userId:string,force=false){
 const report=await prisma.meetingReport.findFirst({where:{id,userId},select:{id:true,title:true,status:true,reviewedAt:true,lastCheckedAt:true,transcriptId:true,createdAt:true}});if(!report)throw new Error('Meeting not found.');
 if(report.reviewedAt||report.status==='READY'||(report.status==='UPLOADING'&&Date.now()-report.createdAt.getTime()<60000))return;
 if(!force&&report.lastCheckedAt&&Date.now()-report.lastCheckedAt.getTime()<45000)return;
 // A conditional claim prevents simultaneous browser refreshes from spending extra API requests.
 const claim=await prisma.meetingReport.updateMany({where:{id,lastCheckedAt:report.lastCheckedAt},data:{lastCheckedAt:new Date()}});if(!claim.count)return;
 const key=await firefliesKey(userId);
 let tid=report.transcriptId;
 if(!tid){const data=await fireflies<{transcripts:{id:string;title:string}[]}>(key,'query { transcripts(limit: 50) { id title } }');tid=data.transcripts.find(t=>t.title.endsWith(`[AA:${id}]`))?.id||null;if(!tid)return;await prisma.meetingReport.update({where:{id},data:{transcriptId:tid}})}
 const data=await fireflies<{transcript:FirefliesTranscript|null}>(key,'query($id: String!) { transcript(id: $id) { id title date duration speakers { id name } sentences { text start_time speaker_name } summary { overview outline notes action_items topics_discussed } } }',{id:tid});
 const t=data.transcript;if(!t)return;
 if(!t.title.endsWith(`[AA:${id}]`))throw new Error('The transcript does not match this upload.');
 // Never overwrite owner edits if a callback arrives during review.
 await prisma.meetingReport.updateMany({where:{id,reviewedAt:null},data:{transcript:JSON.parse(JSON.stringify(t)),...reportFields(t),status:hasSummary(t)?'READY':'SUMMARIZING',audio:null,error:null}});
}
