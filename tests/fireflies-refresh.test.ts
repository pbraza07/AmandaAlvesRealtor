import test from 'node:test';
import assert from 'node:assert/strict';
import {prisma} from '../lib/prisma';
import {refreshMeeting} from '../lib/fireflies';

test('refresh finds exactly its own upload, waits for the summary, and then caches the result',async()=>{
 const original={find:prisma.meetingReport.findFirst,update:prisma.meetingReport.update,updateMany:prisma.meetingReport.updateMany,fetch:globalThis.fetch,key:process.env.FIREFLIES_API_KEY};
 const row:any={id:'meeting-123',userId:'owner-1',title:'Buyer consultation',createdAt:new Date(0),status:'PROCESSING',reviewedAt:null,lastCheckedAt:null,transcriptId:null};let summary:any=null;let reads=0;let writes:any[]=[];
 try{
 process.env.FIREFLIES_API_KEY='test-key';
 prisma.meetingReport.findFirst=(async(args:any)=>args.where.userId===row.userId?{...row}:null) as any;
 prisma.meetingReport.update=(async(args:any)=>{Object.assign(row,args.data);return {...row}}) as any;
 prisma.meetingReport.updateMany=(async(args:any)=>{writes.push(args);if(args.where.reviewedAt===null&&row.reviewedAt)return {count:0};Object.assign(row,args.data);return {count:1}}) as any;
 globalThis.fetch=(async(_url:any,options:any)=>{reads++;const q=JSON.parse(options.body).query;return new Response(JSON.stringify({data:q.includes('transcripts(limit')?{transcripts:[{id:'wrong',title:'Buyer consultation [AA:other]'}, {id:'correct',title:'Buyer consultation [AA:meeting-123]'}]}:{transcript:{id:'correct',title:'Buyer consultation [AA:meeting-123]',sentences:[{text:'Discuss budget',start_time:0}],summary}}}),{headers:{'Content-Type':'application/json'}})}) as any;
 await refreshMeeting(row.id,row.userId);assert.equal(row.transcriptId,'correct');assert.equal(row.status,'SUMMARIZING');assert.equal(row.audio,null);assert.equal(reads,2);
 await refreshMeeting(row.id,row.userId);assert.equal(reads,2,'rapid refresh must not call Fireflies');
 row.lastCheckedAt=null;summary={overview:'Budget and next steps',outline:'Budget',notes:'Discussed homes',action_items:'Amanda: send shortlist'};
 await refreshMeeting(row.id,row.userId);assert.equal(row.status,'READY');assert.equal(row.actionItems,'Amanda: send shortlist');assert.equal(reads,3);
 await refreshMeeting(row.id,row.userId,true);assert.equal(reads,3,'ready reports reuse cached data');
 row.status='SUMMARIZING';row.reviewedAt=new Date();row.overview='Owner correction';await refreshMeeting(row.id,row.userId,true);assert.equal(row.overview,'Owner correction');assert.equal(reads,3);
 assert.ok(writes.some(x=>x.where.reviewedAt===null),'callback writes must not overwrite owner-reviewed notes');
 await assert.rejects(refreshMeeting(row.id,'another-owner'),/not found/);
 }finally{prisma.meetingReport.findFirst=original.find;prisma.meetingReport.update=original.update;prisma.meetingReport.updateMany=original.updateMany;globalThis.fetch=original.fetch;if(original.key===undefined)delete process.env.FIREFLIES_API_KEY;else process.env.FIREFLIES_API_KEY=original.key}
});
