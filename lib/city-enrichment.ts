import type {CityResult} from './city-types';
import {kmBetween} from './city-index';
const cache=new Map<string,{time:number;value:Promise<Partial<CityResult>>}>();
const text=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").slice(0,300);
async function lookup(city:CityResult):Promise<Partial<CityResult>>{
 try{
  const title=city.name+(city.country==='florida'?', Florida':city.country==='costa-rica'?', Costa Rica':'');
  const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',titles:title,prop:'coordinates|pageimages|info',piprop:'thumbnail|name',pithumbsize:'800',inprop:'url'});
  const response=await fetch('https://en.wikipedia.org/w/api.php?'+params,{headers:{'User-Agent':'LifestyleCityExplorer/1.0'},signal:AbortSignal.timeout(4500),next:{revalidate:86400}});
  if(!response.ok)return {};const data=await response.json();
  const page=data.query?.pages?.find((p:{coordinates?:unknown[]})=>p.coordinates?.length);if(!page?.pageimage||!page.coordinates?.[0])return {};
  const geo=page.coordinates[0];if(kmBetween(city.lat,city.lng,geo.lat,geo.lon)>15)return {};
  const creditParams=new URLSearchParams({action:'query',format:'json',formatversion:'2',titles:'File:'+page.pageimage,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'800'});
  const creditResponse=await fetch('https://commons.wikimedia.org/w/api.php?'+creditParams,{headers:{'User-Agent':'LifestyleCityExplorer/1.0'},signal:AbortSignal.timeout(4500),next:{revalidate:86400}});
  if(!creditResponse.ok)return {};const creditData=await creditResponse.json();const image=creditData.query?.pages?.find((p:{imageinfo?:unknown[]})=>p.imageinfo?.length)?.imageinfo?.[0];
  const url=image?.thumburl||image?.url;const license=image?.extmetadata?.LicenseShortName?.value;const author=image?.extmetadata?.Artist?.value;
  if(!url||!/^https:\/\/(thumb|upload)\.wikimedia\.org\//.test(url)||!license||!author||!image.descriptionurl?.startsWith('https://commons.wikimedia.org/'))return {};
  return {image:url,photoKind:'city',photoCredit:{author:text(author),license:text(license),url:image.descriptionurl},encyclopedia:page.fullurl?.startsWith('https://en.wikipedia.org/')?page.fullurl:undefined};
 }catch{return {}}
}
export function enrichCity(city:CityResult){if(city.origin==='curated')return Promise.resolve(city);const key=city.country+':'+city.id;let entry=cache.get(key);if(!entry||Date.now()-entry.time>86400000){if(cache.size>=200)cache.delete(cache.keys().next().value!);entry={time:Date.now(),value:lookup(city)};cache.set(key,entry)}return entry.value.then(extra=>({...city,...extra}))}
