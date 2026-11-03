import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET as listPlaces} from '../app/api/explorer/route';
import {GET as placeDetail} from '../app/api/explorer/place/[id]/route';
import {getEntries,queryCities} from '../lib/city-index';
import {livingResearch} from '../lib/researched-cities';
import type {CityResults} from '../lib/city-types';

test('public list and map are limited to 100 researched places, including old all-indexed links',async()=>{
 for(const country of ['florida','spain','portugal','costa-rica'] as const){
  const ids=new Set<string>();
  for(let page=0;page<5;page++){
   const response=await listPlaces(new NextRequest(`https://example.com/api/explorer?country=${country}&researched=0&page=${page}`));
   assert.equal(response.status,200);const data=await response.json() as CityResults;
   assert.equal(data.total,100);assert.equal(data.countryTotal,100);assert.equal(data.map.total,100);assert.equal(data.hasMore,page<4);
   for(const city of data.places){assert.ok(city.researched);assert.ok(!ids.has(city.id));ids.add(city.id)}
  }
  assert.equal(ids.size,100);
 }
});
test('public details reject unresearched legacy IDs and retain researched city aliases',async()=>{
 const country='florida';const outside=getEntries(country).find(p=>!p.research)!;
 const response=await placeDetail(new NextRequest('https://example.com/api/explorer/place/'+outside.id+'?country='+country),{params:Promise.resolve({id:outside.id})});assert.equal(response.status,404);
 const id=`gn-${livingResearch(country).places[0].geonamesId}`;
 const kept=await placeDetail(new NextRequest('https://example.com/api/explorer/place/'+id+'?country='+country),{params:Promise.resolve({id})});assert.equal(kept.status,200);assert.equal((await kept.json()).researched,true);
});

test('every destination filters to the global top ten in list and map without later pages',async()=>{
 for(const country of ['florida','spain','portugal','costa-rica'] as const){
  const filters=['coast','value','family'] as const;
  const ranked=queryCities({country,filters,researchedOnly:true}).places.slice(0,10);
  const url=`https://example.com/api/explorer?country=${country}&preferences=${filters.join(',')}`;
  const result=await (await listPlaces(new NextRequest(url))).json() as CityResults;
  assert.equal(result.total,10);assert.equal(result.countryTotal,100);assert.equal(result.places.length,10);assert.equal(result.hasMore,false);
  assert.deepEqual(result.places.map(p=>p.id),ranked.map(p=>p.id));
  assert.equal(result.map.total,10);assert.equal(result.map.points.length+result.map.clusters.reduce((n,c)=>n+c.count,0),10);
  assert.ok(result.places.every((p,i,a)=>i===0||p.score!<=a[i-1].score!));
  const later=await (await listPlaces(new NextRequest(url+'&page=1'))).json() as CityResults;assert.equal(later.places.length,0);assert.equal(later.hasMore,false);
  const map=await (await listPlaces(new NextRequest(url+'&map=1&zoom=18'))).json();assert.deepEqual(new Set(map.points.map((p:any)=>p.id)),new Set(ranked.map(p=>p.id)));
 }
});
test('search and saved filters return fewer matches when appropriate, including zero scores',async()=>{
 const madrid=await (await listPlaces(new NextRequest('https://example.com/api/explorer?country=spain&q=Madrid&preferences=coast'))).json() as CityResults;
 const expected=queryCities({country:'spain',researchedOnly:true,search:'Madrid',filters:['coast']});assert.equal(madrid.total,expected.total);assert.ok(madrid.total>0&&madrid.total<10);assert.equal(madrid.places.find(p=>p.name==='Madrid')!.score,0);
 const empty=await (await listPlaces(new NextRequest('https://example.com/api/explorer?country=portugal&saved='))).json() as CityResults;assert.equal(empty.total,0);assert.equal(empty.map.total,0);
});
