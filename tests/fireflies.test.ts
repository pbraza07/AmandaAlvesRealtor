import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {encryptKey,decryptKey,digest,accessMatches,mediaType,readBounded,reportFields,hasSummary} from '../lib/fireflies-core';
import {meetingPdf} from '../lib/meeting-pdf';
import {GET as listMeetings,POST as uploadMeeting} from '../app/api/admin/meetings/route';
import {GET as getConnection,POST as connect} from '../app/api/admin/fireflies/route';
import {GET as getReport,PATCH as editReport,DELETE as deleteReport} from '../app/api/admin/meetings/[id]/route';
import {POST as refreshReport} from '../app/api/admin/meetings/[id]/refresh/route';
import {GET as download} from '../app/api/admin/meetings/[id]/pdf/route';
import {GET as getAudio} from '../app/api/fireflies/audio/[id]/route';
import {NextRequest} from 'next/server';
test('Fireflies credentials are authenticated ciphertext and never equal the original key',()=>{const secret=randomBytes(32).toString('hex'),key='test-fireflies-private-key';const cipher=encryptKey(key,secret);assert.equal(decryptKey(cipher,secret),key);assert.ok(!cipher.includes(key));assert.notEqual(cipher,encryptKey(key,secret));assert.throws(()=>decryptKey(cipher,randomBytes(32).toString('hex')));assert.throws(()=>encryptKey(key,'short'))});
test('audio access tokens require exact matches',()=>{const token=randomBytes(32).toString('base64url');assert.equal(accessMatches(token,digest(token)),true);assert.equal(accessMatches(token+'a',digest(token)),false);assert.equal(accessMatches('',digest(token)),false)});
test('audio validation checks the extension and the file signature',()=>{assert.equal(mediaType('voice.mp3',Buffer.from('ID3audio')),'audio/mpeg');assert.equal(mediaType('voice.wav',Buffer.from('RIFF0000WAVE')),'audio/wav');assert.equal(mediaType('voice.m4a',Buffer.from('0000ftypM4A ')),'audio/mp4');assert.equal(mediaType('voice.mp3',Buffer.from('<html>')) ,null);assert.equal(mediaType('voice.exe',Buffer.from('ID3audio')),null)});
test('bounded uploads reject large bodies including absent content-length',async()=>{await assert.rejects(readBounded(new Request('https://example.com',{method:'POST',body:'123456'}),5));assert.equal((await readBounded(new Request('https://example.com',{method:'POST',body:'123'}),5)).toString(),'123')});
test('missing summaries stay pending and owners/deadlines are never invented',()=>{assert.equal(hasSummary({id:'1',title:'test',summary:null}),false);assert.deepEqual(reportFields({id:'1',title:'test',summary:{overview:'Budget discussion',action_items:'Amanda: send options'}}),{overview:'Budget discussion',agenda:'',notes:'',actionItems:'Amanda: send options'});assert.equal(hasSummary({id:'1',title:'test',summary:{notes:'Completed'}}),true)});
test('all owner endpoints reject anonymous access before touching private data',async()=>{const old=process.env.DATABASE_MODE;process.env.DATABASE_MODE='disabled';try{const req=new Request('https://example.com/api/admin/meetings',{method:'POST'});const c={params:Promise.resolve({id:'private-id'})};for(const r of [await listMeetings(),await uploadMeeting(req),await getConnection(),await connect(req),await getReport(req,c),await editReport(req,c),await deleteReport(req,c),await refreshReport(req,c),await download(req,c)])assert.equal(r.status,401);assert.equal((await getAudio(new NextRequest('https://example.com/api/fireflies/audio/id'),c)).status,401)}finally{if(old===undefined)delete process.env.DATABASE_MODE;else process.env.DATABASE_MODE=old}});
test('branded PDFs paginate long multilingual notes and support optional transcript',async()=>{const notes='Amanda: Confirmar preferências e orçamento. João: Revisar opções em Portugal y España.\n'.repeat(90);const r={title:'Consulta de imóveis · João e Amanda',createdAt:new Date('2026-11-19T15:00:00Z'),overview:'Buyer consultation',agenda:'Budget\nPreferred communities',notes,actionItems:'Amanda: send verified options. Deadline not specified.',reviewedAt:null,transcript:{sentences:[{text:'Transcript appendix '.repeat(100),start_time:61,speaker_name:'Amanda'}]}};const pdf=await meetingPdf(r),withTranscript=await meetingPdf(r,true);assert.ok((await PDFDocument.load(pdf)).getPageCount()>2);assert.ok(withTranscript.length>pdf.length);assert.equal((await PDFDocument.load(pdf)).getAuthor(),'Amanda Alves Realtor')});

test('MP4 recordings use the final extension and MP4 signature',()=>{
 const audio=Buffer.from('0000ftypM4A ');
 assert.equal(mediaType('Conversa Victor WRA.m4a.mp4',audio),'audio/mp4');
 assert.equal(mediaType('meeting.MP4',Buffer.from('0000ftypisom')),'video/mp4');
 assert.equal(mediaType('meeting.m4a.mp4',Buffer.from('<!DOCTYPE html>')),null);
});
test('admin API errors handle HTML gateway and expired-session responses',async()=>{
 const {adminResponse}=await import('../lib/admin-response');
 for(const [status,message] of [[502,/confirm/],[401,/Sign in/],[413,/60 MB/]] as const){
  await assert.rejects(adminResponse(new Response('<!DOCTYPE html>',{status})),message);
 }
 assert.deepEqual(await adminResponse(Response.json({ok:true})),{ok:true});
});
