import {prisma} from '../lib/prisma';
import {fireflies,firefliesKey} from '../lib/fireflies';
import {hasSummary,reportFields,type FirefliesTranscript} from '../lib/fireflies-core';
import {readMeetingSource} from '../lib/meeting-source';
import {isMeetingLanguage} from '../lib/spoken-language';

async function upgradeDrafts(){
 let cursor:string|undefined;
 for(;;){
  const rows=await prisma.meetingReport.findMany({
   where:{status:'READY',reviewedAt:null,compilationVersion:0,...(cursor?{id:{gt:cursor}}:{})},
   orderBy:{id:'asc'},take:8,select:{id:true,userId:true,transcript:true,transcriptId:true,updatedAt:true,uploadLanguage:true}
  });
  if(!rows.length)return;
  for(const row of rows){
   cursor=row.id;
   const stored=row.transcript as FirefliesTranscript|null;
   if(!stored?.id||stored.id!==row.transcriptId||!hasSummary(stored))continue;
   let summary=stored.summary;
   try{
    const current=await readMeetingSource(await firefliesKey(row.userId),stored.id,fireflies);
    if(current?.id===stored.id && current.summary){
     summary={...summary,short_summary:current.summary.short_summary,transcript_chapters:current.summary.transcript_chapters};
    }
   }catch{ /* The saved transcript and original notes are sufficient for offline compilation. */ }
   const transcript={...stored,summary};
   const fields=reportFields(transcript,isMeetingLanguage(row.uploadLanguage)?row.uploadLanguage:undefined);
   await prisma.meetingReport.updateMany({
    where:{id:row.id,updatedAt:row.updatedAt,reviewedAt:null,status:'READY',compilationVersion:0},
    data:{...fields,transcript:JSON.parse(JSON.stringify(transcript)),compilationVersion:1}
   });
  }
 }
}
upgradeDrafts().catch(error=>{console.error('Unable to upgrade existing meeting drafts.',{name:error?.name,code:error?.code,location:String(error?.stack||'').split('\n').find(line=>line.trimStart().startsWith('at '))});process.exitCode=1}).finally(()=>prisma.$disconnect());
