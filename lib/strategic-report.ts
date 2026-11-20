import {noteBlocks} from './meeting-notes';
import {copy,type ReportLanguage} from './report-language';

export function topics(notes:string){
 const result:{title:string;text:string[]}[]=[];
 for(const block of noteBlocks(notes)){
  if(block.heading){result.push({title:block.text.replace(/:$/,''),text:[]});continue}
  if(!result.length)result.push({title:'',text:[]});
  result[result.length-1].text.push(block.text);
 }
 return result;
}
export function strategicReport(notes:string, actionItems:string, lang:ReportLanguage){
 const labels=copy[lang];
 const findings=topics(notes);
 const matches=(pattern:RegExp)=>findings.flatMap(group=>pattern.test(group.title)?group.text:group.text.filter(s=>pattern.test(s)));
 const actions:{owner:string;task:string;due:string}[]=[];
 let owner='';
 for(const b of noteBlocks(actionItems)){
  if(b.heading){owner=b.text.replace(/^[^\p{L}]+/u,'').replace(/:$/,'');continue}
  const name=b.text.match(/^([\p{Lu}][\p{L} .'-]{0,44}):\s+(.+)$/u);
  const task=name?.[2]||b.text;
  const deadline=task.match(/\b(?:até|by|antes de|para el|até o dia|prazo|deadline|fecha límite)\s+([^.;()]{1,48})(?=[.;(]|$)/iu)?.[0];
  actions.push({owner:name?.[1]||owner,task,due:deadline||''});
 }
 const amanda=(name:string)=>/^amanda(?:\s+alves)?(?:\s|$)/i.test(name.trim());
 const recommendations=matches(/recomend|recommend|suger|suggest|deveria|should|preferência por|prioriz|especializaç[aã]o desejada|se aconseja|preferencia por/i);
 const next=matches(/next (meeting|session|steps?)|pr[oó]xim[oa]s? (reuni|sess|pass|reuni[oó]n|pasos?)/i);
 const swot=[
  /forças?|strengths?|fortalezas?|conhecimento .*acumulado|experiência pessoal|local expertise|experiencia previa/i,
  /fraquezas?|weakness|debilidad|falta de|ausência de|lack of|pendente|ainda em construção/i,
  /oportunidad|opportunit|possibilidade|posibilidad|possibility/i,
  /ameaças?|\briscos?\b|threat|\brisks?\b|amenaza|riesgo/i
 ].map(matches);
 const synthesis=matches(/síntese|síntesis|synthesis|leitura cruzada|análisis cruzado|cross.analysis/i);
 const goals=matches(/\b(goals?|targets?|objetivos?|metas?|prioriza|desejad[ao]|planejad[ao]|planned|indicador\w*|milestones?|KPIs?)\b/i);
 const plan=Array.from({length:4},(_,i)=>actions.filter(a=>new RegExp('(?:semana|week)\\s*'+(i+1)+'\\b','i').test(a.task)));
 const unscheduled=actions.filter(a=>!plan.some(w=>w.includes(a)));
 return {labels,findings,recommendations,next,swot,synthesis,goals,actions,client:actions.filter(a=>a.owner&&!amanda(a.owner)),advisor:actions.filter(a=>amanda(a.owner)),unassigned:actions.filter(a=>!a.owner),plan,unscheduled};
}
