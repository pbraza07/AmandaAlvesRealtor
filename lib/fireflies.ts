import {prisma} from './prisma';
import {decryptKey,reportFields,hasSummary,type FirefliesTranscript} from './fireflies-core';
export async function firefliesKey(userId:string){if(process.env.FIREFLIES_API_KEY)return process.env.FIREFLIES_API_KEY;const connection=await prisma.firefliesConnection.findUnique({where:{userId}});if(!connection)throw new Error('Connect your Fireflies account first.');return decryptKey(connection.encryptedKey,process.env.FIREFLIES_ENCRYPTION_KEY||'')}
function providerError(errors: {message?:string; extensions?: Record<string,unknown>}[]) {
 const detail=errors.map(e=>JSON.stringify(e)).join(' ').toLowerCase();
 if(/paid_required|pro_or_higher|paid plan/.test(detail))return 'Your connected Fireflies account requires Pro or higher for API uploads.';
 if(/feature_disabled/.test(detail))return 'Your Fireflies workspace administrator has disabled this feature.';
 if(/credit|quota|upload limit/.test(detail))return 'Fireflies reports that your account allowance is exhausted. Check usage in Fireflies.';
 if(/invalid_language/.test(detail))return 'Fireflies rejected the language. Select Detect automatically.';
 if(/payload_too_small/.test(detail))return 'Fireflies requires at least 50 KB of audio.';
 if(/download|fetch|invalid.url/.test(detail))return 'Fireflies could not download the protected recording.';
 if(/not defined|unknown argument|cannot query field|validation/.test(detail))return 'Fireflies rejected the API request format.';
 const code=String(errors[0]?.extensions?.code||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
 return 'Fireflies rejected the request'+(code?' ('+code+')':'')+'.';
}
export function submitRecording(key:string,origin:string,id:string,title:string,token:string,language=''){
 const input={url:origin+'/api/fireflies/audio/'+id,title:title+' [AA:'+id+']',client_reference_id:id,download_auth:{type:'bearer_token',bearer:{token}},...(language?{custom_language:language}:{})};
 return fireflies<{uploadAudio:{success:boolean}}>(key,'mutation($input: AudioUploadInput!) { uploadAudio(input: $input) { success } }',{input},120000);
}
export async function fireflies<T>(key:string,query:string,variables:Record<string,unknown>={},timeoutMs=18000){
 const r=await fetch('https://api.fireflies.ai/graphql',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(timeoutMs),cache:'no-store'});
 if(!r.ok)throw new Error(r.status===429?'Fireflies rate limit reached. Wait a minute and refresh.':r.status===401?'Fireflies rejected the API key. Reconnect your account.':'Fireflies is temporarily unavailable. Try refreshing later.');
 const body=await r.json();if(body.errors?.length)throw new Error(providerError(body.errors));return body.data as T;
}
export function submissionMessage(error:unknown){
 const message=error instanceof Error?error.message:'';
 if(/^(Fireflies |Your connected Fireflies |Your Fireflies |Configure the production HTTPS )/.test(message))return message;
 return 'Fireflies did not confirm receipt. Meeting Studio will check for an existing transcript.';
}
export async function purgeExpiredAudio(){await prisma.meetingReport.updateMany({where:{expiresAt:{lt:new Date()},audio:{not:null}},data:{audio:null}})}
export const reportSelect={id:true,title:true,fileName:true,status:true,transcriptId:true,overview:true,agenda:true,notes:true,actionItems:true,reviewedAt:true,createdAt:true,updatedAt:true,expiresAt:true,error:true} as const;
export async function refreshMeeting(id:string,userId:string,force=false){
 const report=await prisma.meetingReport.findFirst({where:{id,userId},select:{id:true,title:true,status:true,reviewedAt:true,lastCheckedAt:true,lastRetriedAt:true,transcriptId:true,createdAt:true}});if(!report)throw new Error('Meeting not found.');
 if(report.reviewedAt||report.status==='SAVING'||report.status==='READY'||(report.status==='UPLOADING'&&Date.now()-(report.lastRetriedAt??report.createdAt).getTime()<180000))return;
 if(!force&&report.lastCheckedAt&&Date.now()-report.lastCheckedAt.getTime()<45000)return;
 // A conditional claim prevents simultaneous browser refreshes from spending extra API requests.
 const claim=await prisma.meetingReport.updateMany({where:{id,lastCheckedAt:report.lastCheckedAt},data:{lastCheckedAt:new Date()}});if(!claim.count)return;
 const key=await firefliesKey(userId);
 let tid=report.transcriptId;
 const reportToken=id.toLowerCase();
 const normalized=(title:string)=>title.trim().normalize('NFKC').toLowerCase();
 const marked=(title:string)=>normalized(title).includes('[aa:'+reportToken+']') || (/^c[a-z0-9]{24}$/.test(reportToken) && normalized(title).includes(reportToken));
 const nearSubmission=(date?:number)=>date!=null && date>=report.createdAt.getTime()-300000 && date<=report.createdAt.getTime()+48*3600000;
 if(!tid){
  type Candidate={id:string;title:string;date:number};
  const recent=await fireflies<{transcripts:Candidate[]}>(key,'query { transcripts(limit:50) { id title date } }');
  let match=recent.transcripts.find(t=>marked(t.title));
  if(!match&&recent.transcripts.length>=50){
   const byToken=await fireflies<{transcripts:Candidate[]}>(key,'query($keyword:String!){ transcripts(limit:50,keyword:$keyword) { id title date } }',{keyword:id});
   match=byToken.transcripts.find(t=>marked(t.title));
  }
  if(!match){
   const data=recent.transcripts.length<50?recent:await fireflies<{transcripts:Candidate[]}>(key,'query($keyword:String!){ transcripts(limit:50,keyword:$keyword) { id title date } }',{keyword:report.title});
   const candidates=data.transcripts.filter(t=>normalized(t.title)===normalized(report.title)&&nearSubmission(t.date));
   if(candidates.length>1||data.transcripts.length>=50)return;
   if(candidates.length===1){
    const conflict=await prisma.meetingReport.findFirst({where:{userId,id:{not:id},OR:[{transcriptId:candidates[0].id},{title:{equals:report.title,mode:'insensitive'},createdAt:{gte:new Date(candidates[0].date-48*3600000),lte:new Date(candidates[0].date+300000)}}]},select:{id:true}});
    if(conflict)return;
    match=candidates[0];
   }
  }
  if(!match){
   if(report.status==='CHECK_REQUIRED'||report.status==='UPLOADING'){
    await prisma.meetingReport.updateMany({
     where:{id,status:report.status,transcriptId:null,OR:[{error:null},{error:{startsWith:'Submission could not be confirmed.'}}]},
     data:{status:'CHECK_REQUIRED',error:'Fireflies has not returned a matching transcript. Check the Fireflies upload queue before retrying the saved recording.'}
    });
   }
   return 'no-match' as const;
  }
  tid=match.id;
  await prisma.meetingReport.update({where:{id},data:{transcriptId:tid},select:{id:true}});
 }
 const data=await fireflies<{transcript:FirefliesTranscript|null}>(key,'query($id: String!) { transcript(id: $id) { id title date duration speakers { id name } sentences { text start_time speaker_name } summary { bullet_gist overview outline notes action_items topics_discussed } } }',{id:tid});
 const t=data.transcript;if(!t)return;
 if(t.id!==tid || !(marked(t.title)||(normalized(t.title)===normalized(report.title)&&nearSubmission(t.date))))throw new Error('The transcript does not match this upload.');
 // Never overwrite owner edits if a callback arrives during review.
 await prisma.meetingReport.updateMany({where:{id,reviewedAt:null},data:{transcript:JSON.parse(JSON.stringify(t)),...reportFields(t),status:hasSummary(t)?'READY':'SUMMARIZING',audio:null,error:null}});
}
