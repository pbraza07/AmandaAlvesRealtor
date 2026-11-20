import test from 'node:test';
import assert from 'node:assert/strict';
import {reportFields,hasSummary,type FirefliesTranscript} from '../lib/fireflies-core';
import {readMeetingSource} from '../lib/meeting-source';

test('rationale, conditional proposals and a later revision survive full-meeting compilation',()=>{
 const sentences=Array.from({length:203},(_,i)=>({text:'Okay.',start_time:i*10,speaker_name:'Amanda'}));
 sentences[0].text='We could tour the property on Friday if access is confirmed.';
 sentences[95].text='We need confirmation because the tenant must approve access.';
 sentences[202].text='We agreed to tour on Monday instead of Friday because the tenant approved Monday.';
 const t={id:'fixture',title:'Tour',sentences,summary:{short_summary:'The team discussed scheduling a property tour with the tenant.',notes:'**Tour access**\n- Permission from the tenant',action_items:''}};
 const original=JSON.stringify(t);
 const fields=reportFields(t,'en');
 assert.match(fields.overview,/Monday instead of Friday/);
 assert.match(fields.notes,/could tour.*if access/);assert.match(fields.notes,/tenant must approve/);
 assert.match(fields.notes,/33:40/);assert.equal(fields.actionItems,'');assert.equal(JSON.stringify(t),original);
});
test('Portuguese action sentences retain the assigned person, exact qualifier and source topic',()=>{
 const r=reportFields({id:'1',title:'Consulta',summary:{notes:'**Visita ao imóvel**\nConfirmar a disponibilidade (12:04)',action_items:'**Amanda**\nEnviar a proposta se o cliente aprovar (12:04)'}},'pt');
 assert.match(r.actionItems,/No tópico “Visita ao imóvel”, Amanda ficou responsável por enviar a proposta se o cliente aprovar \(12:04\)\./);
});
test('Spanish chapter paragraphs are included and duplicate chapter titles are excluded',()=>{
 const chapter='La familia explicó que necesita más tiempo para comparar las ofertas.';
 const r=reportFields({id:'1',title:'Consulta',summary:{short_summary:'La familia revisó las condiciones para la compra.',transcript_chapters:['Agenda',chapter,chapter]}},'es');
 assert.ok(r.notes.includes(chapter));assert.equal(r.notes.split(chapter).length,2);assert.doesNotMatch(r.notes,/Agenda/);
});
test('source-only notes cannot prematurely mark a processing transcript complete',()=>{
 const t:FirefliesTranscript={id:'1',title:'t',sentences:[{text:'We agreed to review the documents next week.',start_time:20}]};
 assert.equal(hasSummary(t),false);
 assert.equal(hasSummary({...t,summary:{short_summary:'A completed paragraph.'}}),true);
});
test('unsupported narrative fields fall back to the existing read without uploading again',async()=>{
 const queries:string[]=[];
 const t=await readMeetingSource('fixture','id',async <T>(_key:string,query:string)=>{
  queries.push(query);if(queries.length===1)throw Error('Fireflies rejected the API request format.');
  return {transcript:{id:'id',title:'Meeting'}} as T;
 });
 assert.equal(t?.id,'id');assert.equal(queries.length,2);
 assert.ok(queries.every(q=>q.startsWith('query(')));
});
test('a timestamped earlier action that explicitly changes is flagged with the later source',()=>{
 const r=reportFields({id:'x',title:'Visit',sentences:[{text:'We agreed to tour on Monday instead of Friday.',start_time:155}],summary:{action_items:'**Amanda**\nSchedule the Friday tour (01:00)'}},'en');
 assert.match(r.actionItems,/Earlier proposal to verify/);assert.match(r.actionItems,/2:35/);
 assert.doesNotMatch(r.actionItems,/Amanda will schedule/);
});
test('nullable Fireflies narrative fields preserve the available meeting overview',()=>{
 const t=JSON.parse('{"id":"one","title":"Meeting","summary":{"short_summary":null,"outline":null,"notes":null,"action_items":null,"transcript_chapters":[null],"overview":"Meeting overview"}}');
 assert.equal(reportFields(t).overview,'Meeting overview');
});
