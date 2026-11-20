import type {FirefliesTranscript} from './fireflies-core';
import {noteBlocks,structuredNotes} from './meeting-notes';
import {textLanguage,type ReportLanguage} from './report-language';
import {topics} from './strategic-report';

type Turn=NonNullable<FirefliesTranscript['sentences']>[number];
const labels={
 en:{discussion:'Discussion',record:'Discussion in context',points:'The discussion covered',later:'Later in the meeting',speaker:'A participant'},
 pt:{discussion:'Discussão',record:'Discussão em contexto',points:'A conversa abordou',later:'Mais adiante na reunião',speaker:'Um participante'},
 es:{discussion:'Discusión',record:'Discusión en contexto',points:'En la reunión se abordaron',later:'Más adelante en la reunión',speaker:'Un participante'}
};
const revision=/\b(instead|actually agreed|changed our mind|revised|supersedes|correction|rather than|scratch that|em vez de|ao invés|mudamos|retificando|corrigindo|na verdade.{0,35}(decidimos|combinamos)|en lugar de|rectificamos|cambiamos|corrección)\b/iu;
const decision=/\b(we agreed|we decided|final decision|we will|i will|we cannot|because|subject to|pending|ficou decidido|combinamos|decidimos|vamos|porque|depende|pendente|acordamos|decisión final|pendiente)\b/iu;

function finish(text:string){return /[.!?…]["”»]?$/.test(text)?text:text+'.'}
function substantive(text:string){return text.split(/\s+/).length>=6}
function key(text:string){return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function clock(seconds:number){
 const n=Math.max(0,Math.floor(seconds||0));
 return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
}

// Select evidence across the whole timeline. A late correction outranks a longer early remark.
function evidence(turns:Turn[],count:number){
 const seen=new Set<string>();
 const candidates=turns.flatMap((turn,index)=>{
  const text=turn.text.trim(),normalized=key(text);
  if(!substantive(text)||seen.has(normalized))return [];
  seen.add(normalized);
  const score=(revision.test(text)?100:0)+(decision.test(text)?30:0)+Math.min(text.split(/\s+/).length,30)/3;
  return [{turn,index,score}];
 });
 const chosen:typeof candidates=[];
 for(let i=0;i<count;i++){
  const group=candidates.filter(c=>Math.min(count-1,Math.floor(c.index*count/turns.length))===i);
  const best=group.sort((a,b)=>b.score-a.score||b.index-a.index)[0];
  if(best)chosen.push(best);
 }
 return chosen.map(c=>c.turn);
}

// Keep source facts intact. Nominal shorthand becomes a topic sentence with its supporting details.
function narrativeNotes(value:string,lang:ReportLanguage){
 return topics(value).map(group=>{
  const paragraphs:string[]=[];
  let fragments:string[]=[];
  const flush=()=>{
   if(fragments.length){
    const details=fragments.map(t=>'“'+t.replace(/\.$/,'')+'”');
    paragraphs.push(labels[lang].points+' '+new Intl.ListFormat(lang,{type:'conjunction'}).format(details)+'.');
    fragments=[];
   }
  };
  for(const detail of group.text){
   if(/\(\d+:\d{2}\)/.test(detail)){flush();paragraphs.push(finish(detail));continue}
   if(substantive(detail)||/[?!]$/.test(detail)){flush();paragraphs.push(finish(detail));continue}
   fragments.push(detail);
   if(fragments.length===3)flush();
  }
  flush();
  return [group.title?'**'+group.title+'**':'',...paragraphs].filter(Boolean).join('\n');
 }).join('\n\n');
}

// Expand the provider's explicitly assigned tasks without interpreting a suggestion as a promise.
function commitments(value:string,notes:string,lang:ReportLanguage,turns:Turn[]){
 const byTime=new Map<string,Set<string>>();
 const time=/\((?:\d+:)?\d+:\d{2}\)/;
 for(const group of topics(notes)){
  for(const item of group.text){
   const stamp=item.match(time)?.[0];
   if(stamp&&group.title){
    const titles=byTime.get(stamp)||new Set<string>();titles.add(group.title);byTime.set(stamp,titles);
   }
  }
 }
 const changes=turns.flatMap(turn=>{
  // Only flag an explicitly displaced alternative, with shared subject matter and source time.
  const match=turn.text.match(/(?:instead of|rather than|em vez de|ao invés de|en lugar de)\s+([^.,!?;]{2,85})/iu);
  if(!match)return [];
  const displaced=key(match[1]).split(/\s+/)[0];
  if(displaced.length<4)return [];
  return [{turn,displaced,context:new Set(key(turn.text.slice(0,match.index)).split(' ').filter(w=>w.length>=4))}];
 });
 let owner='';
 const wording={en:{verb:'will',topic:'For'},pt:{verb:'ficou responsável por',topic:'No tópico'},es:{verb:'se encargará de',topic:'En el tema'}}[lang];
 return value.split(/\r?\n/).map(raw=>{
  const [block]=noteBlocks(raw);
  if(!block)return raw;
  if(block.heading){
   owner=block.text.replace(/^[^\p{L}]+/u,'').replace(/:$/,'').trim();
   if(!/^[\p{L}][\p{L} .’'-]{0,55}$/u.test(owner)||/unassigned|unknown|to confirm|sem responsável|sin asignar|action items|ações|acciones/i.test(owner))owner='';
   return raw;
  }
  const task=block.text;
  const timing=task.match(/\((?:(\d+):)?(\d+):(\d{2})\)/);
  const seconds=timing?Number(timing[1]||0)*3600+Number(timing[2])*60+Number(timing[3]):null;
  const words=key(task).split(' ');
  const changed=changes.find(c=>seconds!==null&&c.turn.start_time>seconds&&words.includes(c.displaced)&&words.some(w=>w!==c.displaced&&c.context.has(w)));
  if(changed){
   const flag={en:'Earlier proposal to verify',pt:'Proposta anterior a verificar',es:'Propuesta anterior por verificar'}[lang];
   return flag+' — “'+task+'” ('+labels[lang].later.toLocaleLowerCase(lang)+', '+clock(changed.turn.start_time)+'): “'+finish(changed.turn.text)+'”';
  }
  if(!owner)return raw;
  const imperative=lang==='en'?/^(?:send|share|confirm|review|prepare|schedule|contact|publish|follow up|check|provide|update|arrange|compare|verify|draft|submit)\s/i:/^[\p{L}]+(?:ar|er|ir)\s/iu;
  if(!imperative.test(task))return raw;
  const matches=byTime.get(task.match(time)?.[0]||'');
  const prefix=matches?.size===1?wording.topic+' “'+Array.from(matches)[0]+'”, ':'';
  return finish(prefix+owner+' '+wording.verb+' '+task.charAt(0).toLocaleLowerCase(lang)+task.slice(1));
 }).join('\n').trim();
}

export function compileMeeting(t:FirefliesTranscript,expected?:ReportLanguage){
 const source=t.sentences||[];
 const lang=expected||textLanguage(source.map(s=>s.text).join(' '))||textLanguage(t.summary?.notes||'')||'en';
 const localized=(s:unknown)=>{if(typeof s!=='string')return '';const detected=textLanguage(s);return detected&&detected!==lang?'':s.trim()};
 const summary=t.summary;
 const highlights=evidence(source,4);
 const originalNotes=localized(summary?.notes);
 const agenda=localized(summary?.outline)||localized(summary?.topics_discussed?.join('\n'))||topics(originalNotes).map(g=>g.title).filter(Boolean).join('\n');
 const fullParagraph=localized(summary?.short_summary);
 const outline=localized(summary?.overview);
 let overview=fullParagraph||outline||highlights.map(s=>finish(s.text.trim())).join(' ');
 const correction=highlights.filter(s=>revision.test(s.text)).at(-1);
 if(correction && overview && !key(overview).includes(key(correction.text))){
  overview+='\n\n'+labels[lang].later+' ('+clock(correction.start_time)+') · “'+finish(correction.text.trim())+'”';
 }
 // Chapters are the provider's condensed transcript. Some accounts return just chapter titles.
 const chapters=(Array.isArray(summary?.transcript_chapters)?summary.transcript_chapters:[]).map(s=>localized(s)).filter(s=>substantive(s)&&/[.!?…](?:\s|$)/u.test(s));
 const notes:string[]=[];
 if(originalNotes)notes.push(source.length?narrativeNotes(originalNotes,lang):structuredNotes(originalNotes));
 const existing=key([overview,...notes].join(' '));
 const additional=Array.from(new Set(chapters)).filter(s=>!existing.includes(key(s)));
 if(additional.length)notes.push('**'+labels[lang].discussion+'**\n'+additional.join('\n\n'));
 const used=key(notes.join(' '));
 const context=highlights.filter(s=>!used.includes(key(s.text)));
 if(context.length && (originalNotes||chapters.length||outline||fullParagraph||source.length>1)){
  const paragraphs=context.map(s=>{
   const who=s.speaker_name?.trim()||labels[lang].speaker;
   const later=revision.test(s.text)&&s!==source[0]?labels[lang].later+' · ':'';
   return later+who+' ('+clock(s.start_time)+'): “'+finish(s.text.trim())+'”';
  });
  notes.push('**'+labels[lang].record+'**\n'+paragraphs.join('\n'));
 }
 return {overview,agenda,notes:notes.join('\n\n'),actionItems:commitments(localized(summary?.action_items),originalNotes,lang,source)};
}

export function providerSummaryAvailable(t:FirefliesTranscript){
 const s=t.summary;
 return Boolean(s && [s.short_summary,s.overview,s.outline,s.notes,s.action_items,...(s.transcript_chapters||[]),...(s.topics_discussed||[])].some(v=>typeof v==='string'&&v.trim()));
}
