import test from 'node:test';
import assert from 'node:assert/strict';
import {getEntries,queryCities,cityById} from '../lib/city-index';
import {areas,lifestyleFilters,type CountrySlug} from '../lib/explorer';
import manifest from '../data/cities/manifest.json';
import {translate} from '../lib/i18n/core';
const countries:CountrySlug[]=['florida','spain','portugal','costa-rica'];
test('full source coverage, coordinates and metadata remain valid across more than 61000 candidates',()=>{
 let count=0;
 for(const country of countries){const records=getEntries(country);assert.equal(records.length,manifest.counts[country]);count+=records.length;assert.equal(new Set(records.map(r=>r.id)).size,records.length);for(const r of records){assert.ok(Number.isFinite(r.row[3])&&Math.abs(r.row[3])<=90);assert.ok(Number.isFinite(r.row[4])&&Math.abs(r.row[4])<=180);assert.ok(!['PPLH','PPLQ','PPLW','PPLCH'].includes(r.row[6]));assert.ok(r.row[7]===null||r.row[7]>0);assert.ok(r.row[8]===null||r.row[8]>-1000);assert.ok(r.row[9]>=0);assert.equal(new Set(r.tags).size,r.tags.length)}}
 assert.ok(count>61000);
});
test('all preference combinations keep partial and zero-match cities in the candidate pool',()=>{
 for(const country of countries){const baseline=queryCities({country});for(const filters of [['coast'],['coast','mountains','city'],['family','value','quiet'],lifestyleFilters.map(f=>f.id)] as const){const result=queryCities({country,filters});assert.equal(result.total,baseline.total);assert.equal(result.countryTotal,baseline.total);assert.ok(result.places.every(p=>p.score!==null));assert.ok(result.places.every((p,i,a)=>i===0||p.score!<=a[i-1].score!))}}
 const madrid=queryCities({country:'spain',filters:['coast'],search:'Madrid'});assert.ok(madrid.places.some(p=>p.name==='Madrid'&&p.score===0));
 const uncertain=queryCities({country:'spain',filters:['family'],search:'Barcelona'}).places.find(p=>p.name==='Barcelona');assert.ok(uncertain);assert.ok(uncertain.unknownPreferences>0);assert.equal(uncertain.score,0);
});
test('the index covers new cities and islands with accent-insensitive search',()=>{
 for(const [country,search]of [['florida','Miami'],['florida','Jacksonville'],['spain','Barcelona'],['spain','Las Palmas'],['portugal','Funchal'],['portugal','Ponta Delgada'],['costa-rica','San Jose'],['costa-rica','Cartago']] as const){const r=queryCities({country,search});assert.ok(r.total>0,search);assert.ok(r.places.length>0);assert.ok(r.places.every(p=>p.country===country))}
});
test('cluster counts cover every candidate while keeping map and list responses bounded',()=>{
 const r=queryCities({country:'spain',filters:['coast','city'],zoom:18});assert.ok(r.map.clusters.length+r.map.points.length<=180);assert.equal(r.map.points.length+r.map.clusters.reduce((n,c)=>n+c.count,0),r.total);assert.equal(r.places.length,24);assert.ok(r.hasMore);
 const second=queryCities({country:'spain',filters:['coast','city'],page:1});assert.equal(second.total,r.total);assert.equal(second.places.some(p=>r.places.some(a=>a.id===p.id)),false);
 const view=queryCities({country:'spain',bounds:[38,-1,39,1],zoom:10});assert.equal(view.total,r.total);assert.ok(view.map.visible<view.total);assert.equal(view.map.points.length+view.map.clusters.reduce((n,c)=>n+c.count,0),view.map.visible);
});
test('all existing editorial profiles retain stable IDs, photos and shareable saved locations',()=>{
 for(const area of areas){const found=cityById(area.country,area.id);assert.ok(found);assert.equal(found.origin,'curated');assert.equal(found.image,area.image);assert.equal(found.photoKind,'city')}
 const city=queryCities({country:'spain',search:'Barcelona'}).places[0];assert.ok(city.id.startsWith('gn-'));assert.equal(cityById('spain',city.id)?.name,city.name);const saved=queryCities({country:'spain',savedIds:['alicante',city.id],filters:['mountains']});assert.equal(saved.total,2);
});
test('new indexed profiles are translated and distinguish regional imagery from verified city photos',()=>{
 const city=queryCities({country:'spain',search:'Barcelona'}).places.find(p=>p.name==='Barcelona')!;assert.ok(city);assert.equal(city.photoKind,'regional');assert.match(city.source,/^https:\/\/www.geonames.org\//);
 for(const locale of ['es','pt'] as const)for(const text of [city.intro,city.rhythm,city.consider,city.idealFor])assert.notEqual(translate(text,locale),text);
});
