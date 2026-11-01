import test from 'node:test';
import assert from 'node:assert/strict';
import { areas, lifestyleFilters, filterAreas, parseExplorerParams, explorerQueryString, type CountrySlug } from '../lib/explorer';
const countries:CountrySlug[]=['florida','spain','portugal','costa-rica'];
test('each destination has at least 12 unique, geographically valid area profiles and known tags',()=>{
 assert.equal(new Set(areas.map(a=>a.id)).size,areas.length);
 const bounds={florida:[24,31,-88,-79],spain:[35,44,-10,5],portugal:[36,43,-10,-6],'costa-rica':[8,12,-87,-82]};
 for(const country of countries){const found=filterAreas({country,filters:[]});assert.equal(found.length,country==='spain'||country==='portugal'?14:12);for(const a of found){const [s,n,w,e]=bounds[country];assert.ok(a.lat>=s&&a.lat<=n&&a.lng>=w&&a.lng<=e,a.name);assert.ok(a.tags.length);assert.equal(new Set(a.tags).size,a.tags.length);assert.ok(a.tags.every(t=>lifestyleFilters.some(f=>f.id===t)));assert.match(a.source,/^https:\/\//)}}
});
test('ALL preferences narrow results, ANY broadens and ranks actual matches',()=>{
 const all=filterAreas({country:'spain',filters:['coast','nature','city'],mode:'all'});
 const any=filterAreas({country:'spain',filters:['coast','nature','city'],mode:'any'});
 assert.ok(all.length>0&&all.length<any.length);assert.ok(all.every(a=>['coast','nature','city'].every(t=>a.tags.includes(t as typeof a.tags[number]))));
 let previous=Infinity;for(const a of any){const count=['coast','nature','city'].filter(t=>a.tags.includes(t as typeof a.tags[number])).length;assert.ok(count>0&&count<=previous);previous=count}
 assert.equal(filterAreas({country:'florida',filters:['mountains']}).length,0);
});
test('search combines with preferences and ignores accents; results never cross destinations',()=>{
 assert.deepEqual(filterAreas({country:'portugal',filters:['coast'],search:'Nazare'}).map(a=>a.id),['nazare']);
 assert.equal(filterAreas({country:'portugal',filters:['city'],search:'Nazare'}).length,0);
 assert.equal(filterAreas({country:'florida',filters:[],search:'Tampa'}).some(a=>a.id==='lutz'),true);
 assert.equal(filterAreas({country:'spain',filters:[],search:'Lutz'}).length,0);
});
test('shared explorer views round-trip filters, text, match mode and selected place; unknown tags are ignored',()=>{
 const query=explorerQueryString(['coast','nature'],'Costa Blanca','any','denia');
 assert.deepEqual(parseExplorerParams(new URLSearchParams(query)),{filters:['coast','nature'],search:'Costa Blanca',mode:'any',selectedId:'denia'});
 assert.deepEqual(parseExplorerParams(new URLSearchParams('preferences=coast,fake,coast&match=invalid')).filters,['coast']);
 assert.equal(parseExplorerParams(new URLSearchParams('match=invalid')).mode,'all');
});

test('match percentages reflect selected preferences and do not invent scores for an empty selection',async()=>{
 const {matchPercentage,filtersForCountry}=await import('../lib/explorer');
 const place=areas.find(a=>a.id==='alicante')!;
 assert.equal(matchPercentage(place,[]),null);
 assert.equal(matchPercentage(place,['coast','mountains','city']),67);
 assert.equal(matchPercentage(place,['coast','city']),100);
 assert.equal(filtersForCountry('florida').some(f=>f.id==='mountains'),false);
 assert.equal(filtersForCountry('spain').some(f=>f.id==='mountains'),true);
 assert.ok(lifestyleFilters.some(f=>f.id==='family'));
 assert.equal(lifestyleFilters.find(f=>f.id==='value')?.label,'Affordability');
 assert.equal(lifestyleFilters.some(f=>(f.id as string)==='settling'),false);
});

test('every city has a real photo, a city-specific guide, and travel highlights',()=>{
 for(const place of areas){
  assert.match(place.image,/^\/images\/places\/[a-z-]+\.webp$/);
  assert.ok(place.guideLabel.includes(place.name));
  assert.doesNotMatch(place.source,/places-to-go\/$|destinations\/$|\/destinos$|where-to-go$/);
  assert.ok(place.airport.includes('km straight line'));
  assert.ok(place.idealFor.length>40);
 }
});
