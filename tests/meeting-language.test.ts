import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDetection} from '../lib/spoken-language';
import {reportFields} from '../lib/fireflies-core';
import {strategicReport} from '../lib/strategic-report';
import {submitRecording} from '../lib/fireflies';
test('only confident supported audio detection can select a language',()=>{
 assert.equal(parseDetection('auto-detected language: pt (p = 0.9876)'),'pt');
 assert.equal(parseDetection('auto-detected language: en (p = 0.798)'),null);
 assert.equal(parseDetection('auto-detected language: fr (p = 0.999)'),null);
});
test('language is explicit in the Fireflies upload',async t=>{
 t.mock.method(globalThis,'fetch',async (_url:unknown,options?:RequestInit)=>{
  assert.equal(JSON.parse(String(options?.body)).variables.input.custom_language,'pt');
  return Response.json({data:{uploadAudio:{success:true}}});
 });
 await submitRecording('test','https://example.com','test','session','test','pt');
 assert.throws(()=>submitRecording('test','https://example.com','test','session','test',''),/language/);
});
test('a mismatched English summary never replaces Portuguese speech and agenda uses recorded topics',()=>{
 const text='A gente vai confirmar os imóveis com você para a reunião.';
 const fields=reportFields({id:'test',title:'session',sentences:[{text,start_time:0}],summary:{overview:'The client will review this with their team.',notes:'**Orçamento**\nConfirmar os imóveis para a reunião.'}},'pt');
 assert.equal(fields.overview,text);assert.equal(fields.agenda,'Orçamento');
});
test('ten strategic sections preserve actual assignments, leave unknown dates open and separate explicit week commitments',()=>{
 const s=strategicReport('**Riscos**\nO prazo de financiamento está em risco.', '**Amanda**\nEnviar lista de imóveis.\n**Victor**\nRevisar as propostas na semana 2.','pt');
 assert.equal(s.labels.sections.length,10);
 assert.equal(s.advisor[0].due,'');assert.equal(s.client[0].owner,'Victor');
 assert.equal(s.plan[1].length,1);assert.equal(s.swot[3].length,1);
});
