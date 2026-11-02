import type {Locale} from './i18n/core';
/** A short extractive digest, retaining whole sentences and the source attribution. */
export function condenseCityIntroduction(input:string,locale:Locale='en'):string {
 const clean=input.replace(/<[^>]*>/g,'').replace(/\[[^\]]*\]/g,'').replace(/\([^()]*\)/g,'').replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').trim();
 const sentences=[...new Intl.Segmenter(locale,{granularity:'sentence'}).segment(clean)].map(s=>s.segment.trim()).filter(s=>s.length>25&&/[.!?]$/.test(s)&&!/\.{3}$|…$/.test(s));
 const interest=/coast|beach|histor|cultur|architect|cuisin|food|park|mountain|river|universit|touris|patrimonio|praia|playa|gastronom|costeir|costa|montanh|montañ|río|rio|parque/i;
 const chosen=sentences.filter((sentence,i)=>i===0||interest.test(sentence)).slice(0,3);
 const selected:string[]=[];let length=0;
 for(const sentence of chosen){if(length+sentence.length>700)continue;selected.push(sentence);length+=sentence.length+1}
 return selected.join(' ');
}
