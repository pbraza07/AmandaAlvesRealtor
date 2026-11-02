import type {CityResult} from './city-types';
import {kmBetween} from './city-index';
import type {Locale} from './i18n/core';
import {condenseCityIntroduction} from './city-summary';
const cache=new Map<string,{time:number;value:Promise<Partial<CityResult>>}>();
const text=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").slice(0,300);
const options={headers:{'User-Agent':'LifestyleCityExplorer/1.1'},next:{revalidate:86400}};
async function lookup(city:CityResult,locale:Locale):Promise<Partial<CityResult>>{
 try{
  const title=city.name+(city.country==='florida'?', Florida':city.country==='costa-rica'?', Costa Rica':'');
  const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',titles:title,prop:'coordinates|pageimages|info|extracts|langlinks',piprop:'thumbnail|name',pithumbsize:'800',inprop:'url',exintro:'1',explaintext:'1',exchars:'1200',lllang:locale,lllimit:'1'});
  const response=await fetch('https://en.wikipedia.org/w/api.php?'+params,{...options,signal:AbortSignal.timeout(4500)});
  if(!response.ok)return {};const data=await response.json();
  const page=data.query?.pages?.find((p:{coordinates?:unknown[]})=>p.coordinates?.length);if(!page?.coordinates?.[0])return {};
  const geo=page.coordinates[0];if(kmBetween(city.lat,city.lng,geo.lat,geo.lon)>15)return {};
  const extra:Partial<CityResult>={};
  let summaryPage=locale==='en'?page:undefined;
  if(locale!=='en'){
   const translatedTitle=page.langlinks?.find((link:{lang:string})=>link.lang===locale)?.title;
   if(translatedTitle){const localParams=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',titles:translatedTitle,prop:'extracts|info',inprop:'url',exintro:'1',explaintext:'1',exchars:'1200'});try{const localResponse=await fetch(`https://${locale}.wikipedia.org/w/api.php?${localParams}`,{...options,signal:AbortSignal.timeout(4500)});if(localResponse.ok)summaryPage=(await localResponse.json()).query?.pages?.[0]}catch{}}
  }
  const summary=condenseCityIntroduction(summaryPage?.extract||'',locale);
  if(summary&&summaryPage?.fullurl?.startsWith(`https://${locale}.wikipedia.org/`))extra.overview={summary,sourceTitle:summaryPage.title+' · Wikipedia contributors',url:summaryPage.fullurl,license:'CC BY-SA 4.0',locale};
  // An unavailable or unlicensed photograph must not discard a valid city summary.
  if(city.photoKind==='city'||!page.pageimage)return extra;
  try{
   const creditParams=new URLSearchParams({action:'query',format:'json',formatversion:'2',titles:'File:'+page.pageimage,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'800'});
   const creditResponse=await fetch('https://commons.wikimedia.org/w/api.php?'+creditParams,{...options,signal:AbortSignal.timeout(4500)});
   if(!creditResponse.ok)return extra;const creditData=await creditResponse.json();const image=creditData.query?.pages?.find((p:{imageinfo?:unknown[]})=>p.imageinfo?.length)?.imageinfo?.[0];
   const url=image?.thumburl||image?.url;const license=image?.extmetadata?.LicenseShortName?.value;const author=image?.extmetadata?.Artist?.value;
   if(!url||!/^https:\/\/(thumb|upload)\.wikimedia\.org\//.test(url)||!license||!author||!image.descriptionurl?.startsWith('https://commons.wikimedia.org/'))return extra;
   return {...extra,image:url,photoKind:'city',photoCredit:{author:text(author),license:text(license),url:image.descriptionurl}};
  }catch{return extra}
 }catch{return {}}
}
export function enrichCity(city:CityResult,locale:Locale='en'){
 const key=city.country+':'+city.id+':'+locale;let entry=cache.get(key);
 if(!entry||Date.now()-entry.time>86400000){if(cache.size>=200)cache.delete(cache.keys().next().value!);entry={time:Date.now(),value:lookup(city,locale)};cache.set(key,entry)}
 return entry.value.then(extra=>({...city,...extra}));
}
