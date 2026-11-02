import test from 'node:test';
import assert from 'node:assert/strict';
import {condenseCityIntroduction} from '../lib/city-summary';
import {enrichCity} from '../lib/city-enrichment';
import {cityById,queryCities} from '../lib/city-index';

test('city digest preserves whole factual sentences and removes markup, pronunciation and citations',()=>{
 const summary=condenseCityIntroduction('<b>Example</b> (pronunciation) is a coastal city in Spain.[1] It was listed in a census in 1900. Its historic architecture and parks draw visitors. Its local cuisine includes seafood.');
 assert.ok(summary.startsWith('Example is a coastal city in Spain.'));
 assert.match(summary,/historic architecture/);assert.match(summary,/local cuisine/);
 assert.doesNotMatch(summary,/census|pronunciation|<|\[1\]/);assert.ok(summary.length<=700);
 assert.equal(condenseCityIntroduction(''), '');
});
test('verified city summary survives missing images, is localized, and never changes matching tags or scores',async()=>{
 const originalFetch=globalThis.fetch;
 const indexed=queryCities({country:'spain',search:'Madrid',filters:['coast']}).places.find(p=>p.name==='Madrid')!;
 const city={...indexed,researched:false,photoKind:'regional' as const};
 globalThis.fetch=(async(input)=>{
  const url=new URL(String(input));
  if(url.hostname==='en.wikipedia.org')return Response.json({query:{pages:[{title:'Madrid',fullurl:'https://en.wikipedia.org/wiki/Madrid',coordinates:[{lat:city.lat,lon:city.lng}],extract:'Madrid is the capital and largest city of Spain. Its historic architecture includes palaces and public squares.',langlinks:[{lang:'es',title:'Madrid'}]}]}});
  return Response.json({query:{pages:[{title:'Madrid',fullurl:'https://es.wikipedia.org/wiki/Madrid',extract:'Madrid es una ciudad y capital de España. Su patrimonio histórico incluye palacios y plazas públicas.'}]}});
 }) as typeof fetch;
 try{
  const en=await enrichCity(city,'en');assert.ok(en.overview?.summary.startsWith('Madrid is'));assert.equal(en.photoKind,'regional');assert.deepEqual(en.tags,city.tags);assert.equal(en.score,0);
  const es=await enrichCity(city,'es');assert.ok(es.overview?.summary.startsWith('Madrid es'));assert.equal(es.overview?.locale,'es');assert.equal(es.overview?.license,'CC BY-SA 4.0');assert.match(es.overview?.url||'',/^https:\/\/es\.wikipedia\.org\//);
 }finally{globalThis.fetch=originalFetch}
});
test('wrong-city source coordinates cannot enrich a card',async()=>{
 const originalFetch=globalThis.fetch;const city={...queryCities({country:'florida',search:'Tampa'}).places.find(p=>p.name==='Tampa')!,researched:false,photoKind:'regional' as const};
 globalThis.fetch=(async()=>Response.json({query:{pages:[{title:'Wrong city',coordinates:[{lat:0,lon:0}],extract:'This historic city has a different location.',fullurl:'https://en.wikipedia.org/wiki/Wrong'}]}})) as typeof fetch;
 try{assert.equal((await enrichCity(city)).overview,undefined)}finally{globalThis.fetch=originalFetch}
});
test('ranking is descending across multiple pages and unknown selections count in the denominator',()=>{
 const first=queryCities({country:'spain',filters:['coast','city','family']});const next=queryCities({country:'spain',filters:['coast','city','family'],page:1});
 const scores=[...first.places,...next.places].map(p=>p.score!);assert.ok(scores.every((s,i)=>i===0||s<=scores[i-1]));
 const barcelona=queryCities({country:'spain',search:'Barcelona',filters:['coast','city','family']}).places.find(p=>p.name==='Barcelona')!;
 assert.equal(barcelona.score,67);assert.equal(barcelona.unknownPreferences,1);
});
