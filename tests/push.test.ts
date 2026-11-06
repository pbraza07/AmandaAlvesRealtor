import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {NextRequest} from 'next/server';
import {allowedPushEndpoint,pushSubscriptionSchema,endpointHash,dispatchLeadPush,leadPushPayload,type PushStore,type PushDevice} from '../lib/push-core';
import {GET,POST,DELETE} from '../app/api/admin/push/route';
import {POST as testPush} from '../app/api/admin/push/test/route';
const ecdh=createECDH('prime256v1');ecdh.generateKeys();
const valid={endpoint:'https://fcm.googleapis.com/fcm/send/test-device',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
const devices:PushDevice[]=[{id:'a',endpoint:valid.endpoint,...valid.keys},{id:'b',endpoint:'https://web.push.apple.com/test',...valid.keys},{id:'c',endpoint:'https://updates.push.services.mozilla.com/test',...valid.keys}];
function store(list=devices){const claims=new Set<string>();const removed:string[]=[],done:{id:string;sent:number;failed:number}[]=[];const adapter:PushStore={claim:async id=>{if(claims.has(id))return false;claims.add(id);return true},devices:async()=>list,remove:async id=>{removed.push(id)},complete:async(id,sent,failed)=>{done.push({id,sent,failed})}};return {adapter,removed,done}}
test('device subscriptions validate push services, key material and reject arbitrary network targets',()=>{
 assert.ok(pushSubscriptionSchema.safeParse(valid).success);
 for(const endpoint of ['http://fcm.googleapis.com/send','https://127.0.0.1/push','https://evil.example/push','https://fcm.googleapis.com.evil.example/push','https://fcm.googleapis.com:8443/push','https://user:password@fcm.googleapis.com/push','https://localhost/push'])assert.equal(allowedPushEndpoint(endpoint),false,endpoint);
 assert.equal(pushSubscriptionSchema.safeParse({...valid,keys:{...valid.keys,p256dh:'invalid'}}).success,false);
 assert.equal(pushSubscriptionSchema.safeParse({...valid,keys:{...valid.keys,auth:'invalid'}}).success,false);
 assert.equal(endpointHash(valid.endpoint).length,64);
});
test('each request type has a private admin link without client contact details on lock screen',()=>{
 for(const [type,purpose,label] of [['BUYER',undefined,'buyer'],['SELLER',undefined,'seller'],['BUYER','Lifestyle consultation','lifestyle consultation'],['BUYER','Travel opportunities','travel interest']] as const){const payload=leadPushPayload({id:'abc123',type,details:{inquiryPurpose:purpose,email:'private@example.com',firstName:'Private Client'}});assert.ok(payload.body.includes(label));assert.equal(payload.url,'/admin/leads/abc123');assert.doesNotMatch(JSON.stringify(payload),/private@example.com|Private Client/)}
});
test('new requests alert enabled devices once, including simultaneous form retries',async()=>{
 const s=store();const sent:string[]=[];const lead={id:'lead1',type:'SELLER',details:{}};
 const results=await Promise.all(Array.from({length:5},()=>dispatchLeadPush(lead,s.adapter,async(device)=>{sent.push(device.id)})));
 assert.equal(results.filter(x=>!x.duplicate).length,1);assert.deepEqual(sent.sort(),['a','b','c']);assert.deepEqual(s.done,[{id:'lead1',sent:3,failed:0}]);
 const none=store([]);assert.equal((await dispatchLeadPush(lead,none.adapter,async()=>assert.fail('Disabled devices must not receive alerts'))).sent,0);
});
test('expired subscriptions are removed; transient failures preserve other devices and completion evidence',async()=>{
 const s=store();const result=await dispatchLeadPush({id:'lead2',type:'BUYER',details:{}},s.adapter,async device=>{if(device.id==='a')throw {statusCode:410};if(device.id==='b')throw {statusCode:503}});
 assert.deepEqual(s.removed,['a']);assert.equal(result.sent,1);assert.equal(result.failed,2);assert.equal(s.done[0].failed,2);
});
test('configuration, subscription changes and device tests reject unauthenticated requests',async()=>{
 const mode=process.env.DATABASE_MODE;process.env.DATABASE_MODE='disabled';try{for(const handler of [GET,POST,DELETE,testPush]){const response=await handler(new NextRequest('https://example.com/api/admin/push',{method:'POST',body:JSON.stringify(valid)}));assert.equal(response.status,401)}}finally{if(mode===undefined)delete process.env.DATABASE_MODE;else process.env.DATABASE_MODE=mode}
});
test('worker displays background alerts and only opens private admin paths',async()=>{
 const listeners:Record<string,(event:any)=>void>={};const notifications:{title:string;options:any}[]=[];const opened:string[]=[];
 const self={addEventListener:(name:string,handler:any)=>{listeners[name]=handler},skipWaiting:()=>{},registration:{showNotification:async(title:string,options:any)=>{notifications.push({title,options})}},location:{origin:'https://amanda.example'},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async(url:string)=>{opened.push(url)}}};
 vm.runInNewContext(readFileSync('public/admin-sw.js','utf8'),{self,URL});assert.equal(listeners.fetch,undefined);
 let pending:Promise<unknown>=Promise.resolve();const waitUntil=(p:Promise<unknown>)=>{pending=p};
 listeners.push({data:{json:()=>({title:'New request',body:'Private dashboard',url:'https://evil.example',tag:'lead-x'})},waitUntil});await pending;assert.equal(notifications[0].options.data.url,'/admin');
 listeners.notificationclick({notification:{data:{url:'//evil.example'},close:()=>{}},waitUntil});await pending;assert.equal(opened[0],'https://amanda.example/admin');
 listeners.notificationclick({notification:{data:{url:'/admin/leads/abc123'},close:()=>{}},waitUntil});await pending;assert.equal(opened[1],'https://amanda.example/admin/leads/abc123');
});
