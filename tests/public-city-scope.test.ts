import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET as listPlaces} from '../app/api/explorer/route';
import {GET as placeDetail} from '../app/api/explorer/place/[id]/route';
import {getEntries} from '../lib/city-index';
import {livingResearch} from '../lib/researched-cities';
import type {CityResults} from '../lib/city-types';

test('public list and map are limited to 100 researched places, including old all-indexed links',async()=>{
 for(const country of ['florida','spain','portugal','costa-rica'] as const){
  const ids=new Set<string>();
  for(let page=0;page<5;page++){
   const response=await listPlaces(new NextRequest(`https://example.com/api/explorer?country=${country}&researched=0&page=${page}&preferences=coast,value,family`));
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
