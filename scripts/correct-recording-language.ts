import {readMeetingSource} from '../lib/meeting-source';
import {prisma} from '../lib/prisma';
import {fireflies,firefliesKey} from '../lib/fireflies';
import {type FirefliesTranscript,reportFields,hasSummary} from '../lib/fireflies-core';

// One explicitly requested correction. A persisted claim prevents duplicate uploads across restarts.
// Retain the original report until Fireflies returns a complete replacement in the requested language.
async function correct(id:string,language:string) {
 if(!['pt','es','en'].includes(language))throw new Error('Unsupported correction language.');
 const report=await prisma.meetingReport.findUniqueOrThrow({where:{id},select:{title:true,userId:true,status:true,reviewedAt:true,transcriptId:true,uploadLanguage:true,error:true}});
 if(report.reviewedAt||report.status!=='READY'||!report.transcriptId||report.uploadLanguage===language)return;
 const key=await firefliesKey(report.userId);
 const tag='rev'+language+id;
 const pending='Source language correction pending: '+language;
 const title=report.title+' [AA:'+id+'] '+tag;
 async function findReplacement(){
  const data=await fireflies<{transcripts:{id:string;title:string}[]}>(key,'query($keyword:String!){ transcripts(keyword:$keyword,limit:50){ id title } }',{keyword:tag});
  return data.transcripts.find(t=>t.title.includes(tag)&&t.id!==report.transcriptId);
 }
 let replacement=await findReplacement();
 if(!replacement && report.error!==pending){
  const media=await fireflies<{transcript:{audio_url?:string}}>(key,'query($id:String!){ transcript(id:$id){audio_url} }',{id:report.transcriptId});
  if(!media.transcript?.audio_url || new URL(media.transcript.audio_url).protocol!=='https:')throw new Error('Fireflies has no downloadable source recording for correction.');
  const claim=await prisma.meetingReport.updateMany({where:{id,reviewedAt:null,error:report.error,transcriptId:report.transcriptId},data:{error:pending}});
  if(!claim.count)return;
  const result=await fireflies<{uploadAudio:{success:boolean}}>(key,'mutation($input:AudioUploadInput!){uploadAudio(input:$input){success}}',{input:{title,url:media.transcript.audio_url,custom_language:language,client_reference_id:tag}},120000);
  if(!result.uploadAudio?.success)throw new Error('Fireflies did not acknowledge the language correction.');
  console.log('Fireflies accepted the source-language correction.');
 }
 for(let i=0;i<24;i++){
  replacement??=await findReplacement();
  if(replacement){
   const t=await readMeetingSource(key,replacement.id,fireflies);
   if(t?.id===replacement.id && t.title.includes(tag) && t.sentences?.length && hasSummary(t)){
    const words=t.sentences.map(s=>s.text).join(' ').toLowerCase();
    const terms=language==='pt'?/\b(que|uma|para|com|isso|gente|não|você|então)\b/g:language==='es'?/\b(que|una|para|con|pero|esto)\b/g:/\b(the|and|you|that)\b/g;
    if((words.match(terms)||[]).length<4)throw new Error('Replacement requires a manual language check. Original report preserved.');
    const updated=await prisma.meetingReport.updateMany({where:{id,reviewedAt:null,transcriptId:report.transcriptId},data:{transcriptId:t.id,uploadLanguage:language,transcript:JSON.parse(JSON.stringify(t)),...reportFields(t),compilationVersion:1,error:null}});
    console.log('Completed source language correction:',updated.count);return;
   }
  }
  await new Promise(r=>setTimeout(r,25000));
 }
 console.log('Language correction is still pending.');
}
correct(process.argv[2],process.argv[3]).catch(error=>{
 console.error('Language correction:',error instanceof Error && !/https?:/i.test(error.message)?error.message:'Provider request failed.');process.exitCode=1;
}).finally(()=>prisma.$disconnect());
