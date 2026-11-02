import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {areas,lifestyleFilters,matchPercentage,type Area,type CountrySlug,type FilterId} from './explorer';
import {translate,type Locale} from './i18n/core';
import manifest from '../data/cities/manifest.json';
import airportData from '../data/cities/airports.json';
import type {CityMapData,CityMapPoint,CityMapCluster,CityResult,CityResults,MapBounds} from './city-types';

type Row=[number,string,string,number,number,string,string,number|null,number|null,number];
type Airport=typeof airportData[number];
type Entry={id:string;row:Row;tags:FilterId[];assessed:FilterId[];airport:Airport;airportKm:number;curated?:Area;search:string};
const cache=new Map<CountrySlug,Entry[]>();
const rankings=new Map<string,{entry:Entry;score:number|null}[]>();
const allFilters=lifestyleFilters.map(f=>f.id);
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const curatedLinks=manifest.curatedGeonames as Record<string,number>;
const countries=['florida','spain','portugal','costa-rica'] as const;
export const isCountry=(s:string):s is CountrySlug=>countries.some(c=>c===s);
export function kmBetween(lat:number,lng:number,a:number,b:number){const rad=Math.PI/180;const h=Math.sin((a-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin((b-lng)*rad/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)))}
function nearestAirport(country:CountrySlug,lat:number,lng:number){const found=airportData.filter(a=>a.country===country).map(a=>({airport:a,km:kmBetween(lat,lng,a.lat,a.lng)})).sort((a,b)=>a.km-b.km)[0];if(!found)throw new Error('Airport reference data unavailable');return found}
export function getEntries(country:CountrySlug):Entry[]{
 const hit=cache.get(country);if(hit)return hit;
 const rows=JSON.parse(gunzipSync(readFileSync(join(process.cwd(),'data','cities',country+'.json.gz'))).toString('utf8')) as Row[];
 const profiles=areas.filter(a=>a.country===country);const used=new Set<string>();
 const entries=rows.map(row=>{
  const curated=profiles.find(a=>curatedLinks[a.id]===row[0]);if(curated)used.add(curated.id);
  const nearest=nearestAirport(country,row[3],row[4]);
  const assessed:FilterId[]=['coast','connected'];if(country!=='florida'&&row[8]!==null)assessed.push('mountains');if(row[7]!==null||['PPLC','PPLA'].includes(row[6]))assessed.push('city');
  const tags:FilterId[]=[];if(row[9]<=20)tags.push('coast');if(country!=='florida'&&row[8]!==null&&row[8]>=600)tags.push('mountains');if(nearest.km<=50)tags.push('connected');if((row[7]||0)>=50000||['PPLC','PPLA'].includes(row[6]))tags.push('city');
  return {id:curated?.id||`gn-${row[0]}`,row,tags:curated?[...curated.tags]:tags,assessed:curated?[...allFilters]:assessed,airport:nearest.airport,airportKm:nearest.km,curated,search:normalize(`${row[1]} ${row[2]} ${row[5]} ${curated?.name||''} ${curated?.region||''}`)};
 });
 for(const a of profiles.filter(a=>!used.has(a.id))){const nearest=nearestAirport(country,a.lat,a.lng);entries.push({id:a.id,row:[0,a.name,a.name,a.lat,a.lng,a.region,'PPL',null,null,0],tags:[...a.tags],assessed:[...allFilters],airport:nearest.airport,airportKm:nearest.km,curated:a,search:normalize(`${a.name} ${a.region}`)})}
 cache.set(country,entries);return entries;
}
function detail(entry:Entry,filters:readonly FilterId[]):CityResult{
 const {row,curated}=entry;const country=(curated?.country||entry.airport.country) as CountrySlug;
 const image=country==='florida'?'/images/farmhouse-acreage-hero.webp':`/images/lifestyle-${country}.jpg`;
 const base:Area=curated||{id:entry.id,country,name:row[1],region:row[5],lat:row[3],lng:row[4],tags:entry.tags,image,guideLabel:'GeoNames place record',source:`https://www.geonames.org/${row[0]}/`,airport:'',airportUrl:'',intro:`${row[1]} is a community in ${row[5]}. ${entry.tags.includes('coast')?'Its setting is within 20 km of the coast. ':''}${entry.tags.includes('city')?'Its population or regional role gives it an urban character. ':''}${entry.tags.includes('mountains')?'It has an upland setting at 600 m or more. ':''}${entry.tags.includes('connected')?'A scheduled-service airport is within 50 km.':''}`.trim(),rhythm:'Start with your preferred daily routine, then review local services and neighborhoods.',consider:'Local prices, schools, services and property availability have not been assessed for this indexed place.',idealFor:'A place to discuss if its setting fits your plans; local lifestyle details still need review.'};
 const km=Math.max(5,Math.round(entry.airportKm/5)*5);
 return {...base,tags:entry.tags,airport:`${entry.airport.name} (${entry.airport.code}) · about ${km} km straight line${km>100?' · plan a longer ground transfer':''}. Check routes and seasonal flights.`,airportUrl:entry.airport.url,origin:curated?'curated':'gazetteer',assessedTags:entry.assessed,population:row[7],elevation:row[8],coastKm:row[9],photoKind:curated?'city':'regional',score:matchPercentage({tags:entry.tags},filters),unknownPreferences:filters.filter(f=>!entry.assessed.includes(f)).length};
}
function boundsOf(entries:Entry[]):MapBounds{if(!entries.length)return [0,0,0,0];return entries.reduce<MapBounds>((b,e)=>[Math.min(b[0],e.row[3]),Math.min(b[1],e.row[4]),Math.max(b[2],e.row[3]),Math.max(b[3],e.row[4])],[90,180,-90,-180])}
function mapData(scored:{entry:Entry;score:number|null}[],bounds:MapBounds|undefined,zoom:number):CityMapData{
 const visible=bounds?scored.filter(({entry:e})=>e.row[3]>=bounds[0]&&e.row[3]<=bounds[2]&&e.row[4]>=bounds[1]&&e.row[4]<=bounds[3]):scored;
 let cell=360/2**Math.max(2,Math.min(18,zoom))*.55;
 let buckets=new Map<string,typeof scored>();
 for(let attempt=0;attempt<20;attempt++){
  buckets=new Map();for(const item of visible){const r=item.entry.row;const key=`${Math.floor((r[3]+90)/cell)}:${Math.floor((r[4]+180)/cell)}`;const a=buckets.get(key)||[];a.push(item);buckets.set(key,a)}
  if(buckets.size<=180)break;cell*=1.6;
 }
 const point=({entry:e,score}:{entry:Entry;score:number|null}):CityMapPoint=>({id:e.id,name:e.curated?.name||e.row[1],lat:e.row[3],lng:e.row[4],score});
 const points:CityMapPoint[]=[],clusters:CityMapCluster[]=[];
 for(const [key,members]of buckets){if(members.length===1)points.push(point(members[0]));else{const b=boundsOf(members.map(m=>m.entry));clusters.push({id:key,lat:(b[0]+b[2])/2,lng:(b[1]+b[3])/2,count:members.length,bounds:b,members:members.slice(0,8).map(point),maxScore:members[0].score})}}
 return {points,clusters,total:scored.length,visible:visible.length,bounds:boundsOf(scored.map(s=>s.entry))};
}
export type CityQuery={country:CountrySlug;filters?:readonly FilterId[];search?:string;locale?:Locale;page?:number;savedIds?:string[];bounds?:MapBounds;zoom?:number};
export function queryCities({country,filters=[],search='',locale='en',page=0,savedIds,bounds,zoom=7}:CityQuery):CityResults{
 const selected=[...new Set(filters)];const q=normalize(search).slice(0,100);const all=getEntries(country);const saved=savedIds?new Set(savedIds):undefined;
 const key=JSON.stringify([country,[...selected].sort(),q,locale,savedIds?[...savedIds].sort():null]);
 let scored=rankings.get(key);
 if(!scored){
 const rows=all.filter(e=>(!saved||saved.has(e.id)||saved.has(`gn-${e.row[0]}`))&&(!q||e.search.includes(q)||normalize(`${translate(e.row[1],locale)} ${translate(e.row[5],locale)} ${translate(e.curated?.region||'',locale)}`).includes(q)));
 scored=rows.map(entry=>({entry,score:matchPercentage({tags:entry.tags},selected)})).sort((a,b)=>(b.score??0)-(a.score??0)||((normalize(a.entry.row[1])===q?0:1)-(normalize(b.entry.row[1])===q?0:1))||(b.entry.row[7]||0)-(a.entry.row[7]||0)||(a.entry.curated?0:1)-(b.entry.curated?0:1)||a.entry.row[1].localeCompare(b.entry.row[1])||a.entry.id.localeCompare(b.entry.id));
 if(rankings.size>=8)rankings.delete(rankings.keys().next().value!);rankings.set(key,scored);
 }
 const pageSize=24;const validPage=Math.max(0,Math.floor(page));
 return {country,total:scored.length,countryTotal:all.length,page:validPage,pageSize,hasMore:(validPage+1)*pageSize<scored.length,places:scored.slice(validPage*pageSize,(validPage+1)*pageSize).map(s=>detail(s.entry,selected)),map:mapData(scored,bounds,zoom),updatedAt:manifest.updatedAt};
}
export function cityById(country:CountrySlug,id:string,filters:readonly FilterId[]=[]){const entry=getEntries(country).find(e=>e.id===id||`gn-${e.row[0]}`===id);return entry?detail(entry,filters):undefined}
