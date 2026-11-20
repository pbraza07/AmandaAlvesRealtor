import test from 'node:test';
import assert from 'node:assert/strict';
import {prisma} from '../lib/prisma';
import {refreshMeeting} from '../lib/fireflies';

test('refresh finds exactly its own upload, waits for the summary, and then caches the result',async()=>{
 const original={find:prisma.meetingReport.findFirst,update:prisma.meetingReport.update,updateMany:prisma.meetingReport.updateMany,fetch:globalThis.fetch,key:process.env.FIREFLIES_API_KEY};
 const row:any={id:'c123456789012345678901234',userId:'owner-1',title:'Buyer consultation',createdAt:new Date(0),status:'PROCESSING',reviewedAt:null,lastCheckedAt:null,transcriptId:null};let summary:any=null;let reads=0;let writes:any[]=[];
 try{
 process.env.FIREFLIES_API_KEY='test-key';
 prisma.meetingReport.findFirst=(async(args:any)=>args.where.userId===row.userId?{...row}:null) as any;
 prisma.meetingReport.update=(async(args:any)=>{Object.assign(row,args.data);return {...row}}) as any;
 prisma.meetingReport.updateMany=(async(args:any)=>{writes.push(args);if(args.where.reviewedAt===null&&row.reviewedAt)return {count:0};Object.assign(row,args.data);return {count:1}}) as any;
 globalThis.fetch=(async(_url:any,options:any)=>{reads++;const q=JSON.parse(options.body).query;return new Response(JSON.stringify({data:q.includes('transcripts(limit')?{transcripts:[{id:'wrong',title:'Buyer consultation [AA:other]'}, {id:'correct',title:'Buyer consultation AAc123456789012345678901234'}]}:{transcript:{id:'correct',title:'Buyer consultation AAc123456789012345678901234',sentences:[{text:'Discuss budget',start_time:0}],summary}}}),{headers:{'Content-Type':'application/json'}})}) as any;
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

test('links an untagged completed upload only with one matching title, date and local report',async t=>{
 const row={id:'test-report',userId:'owner',title:'Ale School Audio',status:'PROCESSING',createdAt:new Date(),lastCheckedAt:null,reviewedAt:null,transcriptId:null};
 const candidate={id:'provider-id',title:'Ale School Audio',date:row.createdAt.getTime()};
 const original=process.env.FIREFLIES_API_KEY;
 process.env.FIREFLIES_API_KEY='fixture';
 t.after(()=>{if(original===undefined)delete process.env.FIREFLIES_API_KEY;else process.env.FIREFLIES_API_KEY=original});
 let conflict=true;
 const db=prisma.meetingReport;
 const methods={findFirst:db.findFirst,update:db.update,updateMany:db.updateMany};
 t.after(()=>Object.assign(db,methods));
 db.findFirst=(async(args:any)=>args.where.id===row.id?row:conflict?{id:'other'}:null) as any;
 let links=0;let status='';
 db.update=(async()=>{links++;return {}}) as any;
 db.updateMany=(async(args:any)=>{status=args.data.status;return {count:1}}) as any;
 t.mock.method(globalThis,'fetch',async(_url:any,options:any)=>{
  const {query}=JSON.parse(options.body);
  return Response.json({data:query.includes('transcripts(limit')?{transcripts:[candidate]}:{transcript:{...candidate,summary:{overview:'Summary'}}}});
 });
 await refreshMeeting(row.id,row.userId);
 assert.equal(links,0);
 conflict=false;
 await refreshMeeting(row.id,row.userId);
 assert.equal(links,1);
 assert.equal(status,'READY');
});

test('checks an unconfirmed upload without submitting audio or searching a short account listing repeatedly',async t=>{
 const db=prisma.meetingReport;
 const row={id:'c123456789012345678901234',userId:'owner',title:'WRA meeting',status:'CHECK_REQUIRED',createdAt:new Date(0),lastCheckedAt:null,reviewedAt:null,transcriptId:null};
 const oldKey=process.env.FIREFLIES_API_KEY;
 process.env.FIREFLIES_API_KEY='fixture';
 t.after(()=>{if(oldKey===undefined)delete process.env.FIREFLIES_API_KEY;else process.env.FIREFLIES_API_KEY=oldKey});
 const methods={findFirst:db.findFirst,updateMany:db.updateMany};t.after(()=>Object.assign(db,methods));
 db.findFirst=(async()=>row) as any;
 db.updateMany=(async()=>({count:1})) as any;
 const calls=t.mock.method(globalThis,'fetch',async(_url:unknown,options:any)=>{
  assert.match(JSON.parse(options.body).query,/^query/);
  return Response.json({data:{transcripts:[]}});
 });
 assert.equal(await refreshMeeting(row.id,row.userId,true),'no-match');
 assert.equal(calls.mock.callCount(),1);
});

test('a lost refresh claim cannot trigger a second submission during saved-audio recovery',async t=>{
 const {retrySavedRecording}=await import('../lib/retry-recording');
 const db=prisma.meetingReport;
 const oldKey=process.env.FIREFLIES_API_KEY;process.env.FIREFLIES_API_KEY='fixture';
 t.after(()=>{if(oldKey===undefined)delete process.env.FIREFLIES_API_KEY;else process.env.FIREFLIES_API_KEY=oldKey});
 const methods={findFirst:db.findFirst,updateMany:db.updateMany};t.after(()=>Object.assign(db,methods));
 db.findFirst=(async()=>({id:'report',status:'CHECK_REQUIRED',createdAt:new Date(),lastRetriedAt:null,reviewedAt:null,lastCheckedAt:null,transcriptId:null})) as any;
 db.updateMany=(async()=>({count:0})) as any;
 const calls=t.mock.method(globalThis,'fetch',async()=>{throw new Error('Unexpected upload')});
 await retrySavedRecording('report','owner','https://example.com');
 assert.equal(calls.mock.callCount(),0);
});
