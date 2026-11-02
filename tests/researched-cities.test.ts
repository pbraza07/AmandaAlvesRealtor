import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {livingResearch,cityResearchPhoto} from '../lib/researched-cities';
import {cityById,getEntries,queryCities} from '../lib/city-index';
import {type CountrySlug,lifestyleFilters} from '../lib/explorer';
import airports from '../data/cities/airports.json';
const countries:CountrySlug[]=['florida','portugal','spain','costa-rica'];
test('400 researched guides have distinct real place identities, source evidence, three languages and valid commercial gateways',()=>{
 let total=0;
 for(const country of countries){
  const research=livingResearch(country);assert.equal(research.country,country);assert.equal(research.places.length,100);total+=research.places.length;
  const entries=new Map(getEntries(country).map(e=>[e.row[0],e]));
  assert.equal(new Set(research.places.map(p=>p.geonamesId)).size,100);assert.deepEqual(research.places.map(p=>p.rank).sort((a,b)=>a-b),Array.from({length:100},(_,i)=>i+1));
  for(const place of research.places){
   assert.ok(entries.has(place.geonamesId),`${country}: ${place.name}`);assert.ok(place.sources.length>0,place.name);
   assert.ok(airports.some(a=>a.code===place.airportCode&&a.country===country),`${place.name}: airport ${place.airportCode}`);
   assert.ok(!['OPF','DSI','CAT','SYQ'].includes(place.airportCode),place.name);
   if(country==='costa-rica')assert.ok(['SJO','LIR'].includes(place.airportCode));
   for(const source of place.sources){assert.ok(new URL(source.url).protocol==='https:');assert.ok(source.title.trim().length>3)}
   for(const lang of ['en','es','pt'] as const){for(const field of ['intro','rhythm','idealFor','consider'] as const){const text=place.content[lang][field];assert.ok(text.trim().length>=20,`${place.name} ${lang} ${field}`);assert.doesNotMatch(text,/Start with your preferred daily routine|local lifestyle details still need review/i)}assert.notEqual(place.content[lang].rhythm,place.content[lang].idealFor)}
  }
  for(const lang of ['en','es','pt'] as const)for(const field of ['intro','rhythm','idealFor'] as const)assert.equal(new Set(research.places.map(p=>p.content[lang][field])).size,100,`${country}: duplicate ${lang} ${field}`);
 }
 assert.equal(total,400);
});
test('researched view contains exactly 100 unique candidates across pagination and every preference retains all 100',()=>{
 for(const country of countries){const all=queryCities({country});assert.equal(all.researchedTotal,100);assert.equal(all.countryTotal,all.total);assert.ok(all.total>5000);
  const ids=new Set<string>();for(let page=0;page<5;page++){const result=queryCities({country,researchedOnly:true,page});assert.equal(result.total,100);assert.equal(result.hasMore,page<4);for(const p of result.places){assert.ok(p.researched);assert.ok(!ids.has(p.id));ids.add(p.id)}}assert.equal(ids.size,100);
  for(const filters of [['coast'],['value','family'],lifestyleFilters.map(f=>f.id)] as const){const result=queryCities({country,researchedOnly:true,filters});assert.equal(result.total,100);assert.ok(result.places.every((p,i,a)=>i===0||p.score!<=a[i-1].score!));assert.equal(result.map.points.length+result.map.clusters.reduce((n,c)=>n+c.count,0),100)}
 }
});
test('stored city-specific copy is available immediately in each language and does not depend on live summary lookup',()=>{
 for(const country of countries)for(const profile of livingResearch(country).places){
  for(const lang of ['en','es','pt'] as const){const city=cityById(country,`gn-${profile.geonamesId}`,[],lang)!;assert.ok(city.researched);assert.equal(city.rhythm,profile.content[lang].rhythm);assert.equal(city.idealFor,profile.content[lang].idealFor);assert.equal(city.researchSources?.length,profile.sources.length);assert.equal(city.researchCopy?.[lang].intro,profile.content[lang].intro);assert.match(city.airport,new RegExp(`\\(${profile.airportCode}\\)`))}
 }
});
test('research tie-breaks never override a higher match and zero matches remain candidates',()=>{
 const country='portugal';const all=queryCities({country,filters:['coast','culture','family']});const allPages=Array.from({length:5},(_,page)=>queryCities({country,researchedOnly:true,filters:['coast','culture','family'],page}).places).flat();assert.ok(allPages.every((p,i,a)=>i===0||p.score!<=a[i-1].score!));assert.equal(all.countryTotal,getEntries(country).length);
 const madrid=cityById('spain',`gn-${livingResearch('spain').places.find(p=>p.name==='Madrid')!.geonamesId}`,['coast'])!;assert.equal(madrid.score,0);assert.ok(queryCities({country:'spain',filters:['coast'],search:'Madrid'}).places.some(p=>p.id===madrid.id));
});
test('verified photo metadata is licensed, city-matched and separate from unsupported regional inspiration',()=>{
 const photos=JSON.parse(readFileSync('data/research/photos.json','utf8')) as Record<string,{image:string;author:string;license:string;url:string;verifiedDistanceKm:number}>;
 for(const photo of Object.values(photos)){assert.match(photo.image,/^https:\/\/(upload|thumb)\.wikimedia\.org\//);assert.ok(photo.author&&photo.license);assert.match(photo.url,/^https:\/\/commons\.wikimedia\.org\//);assert.ok(photo.verifiedDistanceKm<=15)}
 const funchal=livingResearch('portugal').places.find(p=>p.name==='Funchal')!;const photo=cityResearchPhoto(funchal.geonamesId);assert.ok(photo);const city=cityById('portugal',`gn-${funchal.geonamesId}`)!;assert.equal(city.photoKind,'city');assert.equal(city.image,photo.image);assert.match(city.rhythm,/garden|market|marina|Madeira|promenade|Monte/i);
});
