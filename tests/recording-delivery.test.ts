import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {prisma} from '../lib/prisma';
import {deliverRecording,maintainRecordingStates} from '../lib/recording-delivery';
import {refreshMeeting} from '../lib/fireflies';

function stubDb(t:TestContext,method:'findFirst'|'updateMany',fn:(arg:any)=>Promise<any>){
 const delegate=prisma.meetingReport;
 const original=delegate[method];
 Object.assign(delegate,{[method]:fn});
 t.after(()=>Object.assign(delegate,{[method]:original}));
}
function scenario(t:TestContext,reply:()=>Promise<Response>){
 const old=process.env.FIREFLIES_API_KEY;process.env.FIREFLIES_API_KEY='test';
 t.after(()=>{if(old===undefined)delete process.env.FIREFLIES_API_KEY;else process.env.FIREFLIES_API_KEY=old});
 const row={id:'record',userId:'owner',title:'Meeting',uploadLanguage:'pt',deliveryAttempts:0,status:'QUEUED',accessHash:'',nextDeliveryAt:new Date(0),reviewedAt:null,transcriptId:null,error:null};
 stubDb(t,'findFirst',async({where}:any)=>where.status && (!where.status.in.includes(row.status)||row.nextDeliveryAt>where.nextDeliveryAt.lte)?null:{...row});
 stubDb(t,'updateMany',async({where,data}:any)=>{
  if(typeof where.status==='string'&&where.status!==row.status || where.status?.in&&!where.status.in.includes(row.status) || where.deliveryAttempts!==undefined&&where.deliveryAttempts!==row.deliveryAttempts || where.accessHash&&where.accessHash!==row.accessHash)return {count:0};
  Object.assign(row,data,{deliveryAttempts:row.deliveryAttempts+(data.deliveryAttempts?.increment||0)});
  return {count:1};
 });
 const fetch=t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{
  const input=JSON.parse(String(options.body)).variables.input;
  assert.equal(input.client_reference_id,'record');assert.equal(input.custom_language,'pt');
  return reply();
 });
 const send=()=>deliverRecording(row.id,'https://example.com');
 return {row,fetch,send};
}
test('two workers and a later restart submit a persisted recording only once',async t=>{
 const s=scenario(t,async()=>Response.json({data:{uploadAudio:{success:true}}}));
 await Promise.all([s.send(),s.send()]);await s.send();
 assert.equal(s.fetch.mock.callCount(),1);assert.equal(s.row.status,'PROCESSING');
 assert.equal(s.row.deliveryAttempts,1);
});
test('rate-limited uploads respect the persisted backoff, then finish without the upload request',async t=>{
 let calls=0;
 const s=scenario(t,async()=>++calls===1?new Response(null,{status:429}):Response.json({data:{uploadAudio:{success:true}}}));
 await s.send();assert.equal(s.row.status,'RETRY_WAIT');assert.ok(s.row.nextDeliveryAt.getTime()>Date.now());
 await s.send();assert.equal(calls,1);s.row.nextDeliveryAt=new Date(0);await s.send();
 assert.equal(calls,2);assert.equal(s.row.status,'PROCESSING');
});
test('safe retries are capped and show a recoverable failure',async t=>{
 const s=scenario(t,async()=>new Response(null,{status:429}));
 for(let i=0;i<5;i++){s.row.nextDeliveryAt=new Date(0);await s.send()}
 assert.equal(s.fetch.mock.callCount(),4);assert.equal(s.row.status,'CHECK_REQUIRED');
});
test('a lost response or exhausted allowance never causes a blind second upload',async t=>{
 for(const reply of [async()=>{throw new TypeError('fetch failed')},async()=>Response.json({errors:[{message:'upload quota exhausted'}]})]){
  await t.test(async test=>{const s=scenario(test,reply);await s.send();await s.send();assert.equal(s.row.status,'CHECK_REQUIRED');assert.equal(s.fetch.mock.callCount(),1);assert.ok(s.row.error)})
 }
});
test('a browser refresh cannot treat a queued recording as an earlier submission',async t=>{
 const s=scenario(t,async()=>{throw Error('unexpected upload')});
 await refreshMeeting(s.row.id,s.row.userId,true);
 assert.equal(s.row.status,'QUEUED');assert.equal(s.fetch.mock.callCount(),0);
});
test('stale saves, uncertain sends and long-running jobs have distinct recovery states',async t=>{
 const writes:{where:any;data:any}[]=[];
 stubDb(t,'updateMany',async(args:any)=>{writes.push(args);return {count:0}});
 await maintainRecordingStates();
 assert.ok(writes.some(w=>w.where.status==='SAVING'&&w.data.status==='INCOMPLETE'&&w.data.audio===null));
 assert.ok(writes.some(w=>w.where.status==='UPLOADING'&&w.data.status==='CHECK_REQUIRED'));
 assert.ok(writes.some(w=>w.data.status==='PROVIDER_DELAYED'));assert.ok(writes.some(w=>w.data.status==='ACTION_REQUIRED'));
});
