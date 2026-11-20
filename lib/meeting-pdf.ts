import {PDFDocument,StandardFonts,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {getContent} from './content';
import {noteBlocks} from './meeting-notes';
import {topics,strategicReport} from './strategic-report';
import {copy,textLanguage,type ReportLanguage} from './report-language';
import type {FirefliesTranscript} from './fireflies-core';

type Report={title:string;createdAt:Date;overview:string;agenda:string;notes:string;actionItems:string;reviewedAt:Date|null;transcript:unknown;uploadLanguage?:string|null};
const green=rgb(.09,.21,.17),gold=rgb(.67,.53,.29),ink=rgb(.13,.16,.14),muted=rgb(.32,.36,.33),tint=rgb(.95,.96,.94),white=rgb(1,1,1);
const left=44,right=568,width=right-left,bottom=65;
export async function meetingPdf(report:Report,includeTranscript=false){
 const t=report.transcript as FirefliesTranscript|null;
 const language:ReportLanguage=report.uploadLanguage==='pt'||report.uploadLanguage==='es'||report.uploadLanguage==='en'
   ?report.uploadLanguage:textLanguage((t?.sentences||[]).slice(0,100).map(s=>s.text).join(' '))||textLanguage(report.notes+' '+report.overview)||'en';
 const l=copy[language],data=strategicReport(report.notes,report.actionItems,language);
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);doc.setTitle(report.title);doc.setLanguage(l.locale);doc.setSubject(l.title);doc.setAuthor('Amanda Alves Realtor');
 const root=path.join(process.cwd(),'public');
 const [regular,bold,logo,site]=await Promise.all([readFile(path.join(root,'fonts/DejaVuSans.ttf')),readFile(path.join(root,'fonts/DejaVuSans-Bold.ttf')),readFile(path.join(root,'images/agile-group-logo-dark.webp')).then(b=>sharp(b).png().toBuffer()),getContent()]);
 const body=await doc.embedFont(regular,{subset:true}),strong=await doc.embedFont(bold,{subset:true}),serif=await doc.embedFont(StandardFonts.TimesRomanBold),image=await doc.embedPng(logo);
 const supported=new Set(body.getCharacterSet());
 const clean=(v:string)=>Array.from(v.normalize('NFC').replace(/\*\*|__/g,'')).filter(c=>c==='\n'||supported.has(c.codePointAt(0)!)).join('');
 let page!:PDFPage,y=0;
 function rule(yy:number){page.drawLine({start:{x:left,y:yy},end:{x:right,y:yy},thickness:.8,color:gold})}
 function newPage(){
  page=doc.addPage([612,792]);page.drawText('Amanda Alves',{x:left,y:744,size:21,font:serif,color:green});
  page.drawText('R E A L T O R',{x:left,y:731,size:8,font:strong,color:green});
  const size=image.scaleToFit(75,28);page.drawImage(image,{x:right-size.width,y:730,width:size.width,height:size.height});rule(718);y=691;
 }
 function ensure(h:number){if(y-h<bottom)newPage()}
 function lines(value:string,max:number,size:number,font:PDFFont){
  const out:string[]=[];
  for(const paragraph of clean(value).split(/\n/)){
   let line='';
   for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
    if(line && font.widthOfTextAtSize(line+' '+word,size)>max){out.push(line);line=''}
    if(line)line+=' ';
    for(const ch of word){if(line && font.widthOfTextAtSize(line+ch,size)>max){out.push(line);line=''}line+=ch}
   }
   if(line)out.push(line);
  }
  return out;
 }
 function paragraph(value:string,font=body,size=10.5,color=ink,indent=0){
  for(const s of lines(value,width-indent,size,font)){ensure(size*1.55);page.drawText(s,{x:left+indent,y,size,font,color});y-=size*1.55}
 }
 function blocks(value:string){for(const b of noteBlocks(value)){paragraph(b.text,b.heading?strong:body);y-=4}}
 function sub(label:string){ensure(45);y-=8;paragraph(label,strong,10,green);y-=3}
 function section(index:number){
  ensure(138);y-=12;rule(y+5);y-=15;
  paragraph(String(index+1).padStart(2,'0')+'   /   '+l.categories[index].toLocaleUpperCase(l.locale),strong,9,gold);
  y-=10;paragraph(l.sections[index],serif,23,green);y-=5;
 }
 function items(values:string[]){if(!values.length){paragraph(l.empty,body,10,muted);return}
  for(const [i,v] of values.entries()){ensure(30);page.drawText(String(i+1).padStart(2,'0'),{x:left,y,font:strong,size:9,color:gold});paragraph(v,body,10.5,ink,28);y-=5}
 }
 function table(headers:string[],sizes:number[],rows:string[][]){
  if(!rows.length){paragraph(l.empty,body,10,muted);return}
  function header(){let x=left;page.drawRectangle({x:left,y:y-6,width,height:21,color:green});
   headers.forEach((v,i)=>{page.drawText(v,{x:x+6,y,size:9,font:strong,color:white});x+=sizes[i]});y-=24}
  ensure(55);header();
  for(const row of rows){
   const cells=row.map((v,i)=>lines(v||l.pending,sizes[i]-12,9.5,i===0?strong:body));
   const n=Math.max(1,...cells.map(c=>c.length));
   for(let j=0;j<n;j++){
    if(y<bottom+16){newPage();header()}
    let x=left;cells.forEach((cell,i)=>{if(cell[j])page.drawText(cell[j],{x:x+6,y,size:9.5,font:i===0?strong:body,color:ink});x+=sizes[i]});y-=14;
   }
   y-=4;rule(y+2);y-=12;
  }
 }
 function actionTable(rows:typeof data.actions){table([l.owner,l.action,l.due],[101,320,103],rows.map(a=>[a.owner,a.task,a.due]))}
 newPage();y=623;
 paragraph(l.private,strong,10,gold);y-=31;paragraph(l.title,serif,36,green);y-=5;paragraph(report.title,strong,19,green);
 y-=22;rule(y);y-=27;paragraph(l.details,strong,13,green);
 paragraph(l.date+' · '+new Intl.DateTimeFormat(l.locale,{dateStyle:'long',timeZone:'America/New_York'}).format(report.createdAt));
 if(t?.duration)paragraph(l.duration+' · '+Math.round(t.duration)+' min');
 if(t?.speakers?.length)paragraph(l.participants+' · '+t.speakers.map(s=>s.name).join(', '));
 y-=28;paragraph(l.prepared,strong,11,green);
 for(const v of [site.brokerageName,site.phone,site.email])if(v&&!v.startsWith('['))paragraph(v,body,10,muted);
 paragraph(report.reviewedAt?l.reviewed:l.draft,body,10,muted);
 newPage();section(0);
 const keyPoints=report.overview.split(/\r?\n/).map(line=>line.match(/^\s*[-•*]?\s*\*\*([^*]+?)[:]?\*\*:?\s*(.+)$/));
 const cards=keyPoints.length>1&&keyPoints.every(Boolean);
 if(cards){
  sub(l.insights);
  for(const point of keyPoints){if(!point)continue;ensure(59);
   page.drawRectangle({x:left,y:y-5,width:3,height:16,color:gold});
   paragraph(point[1].replace(/:$/,''),strong,11,green,13);paragraph(point[2],body,10.5,ink,13);y-=8;
  }
 }else blocks(report.overview||l.empty);
 const gist=report.reviewedAt?'':t?.summary?.bullet_gist||'';
 if(!cards&&gist&&(!textLanguage(gist)||textLanguage(gist)===language)){
  sub(l.insights);
  for(const entry of noteBlocks(gist)){ensure(38);page.drawRectangle({x:left,y:y-5,width:3,height:16,color:gold});paragraph(entry.text,body,10.5,ink,12);y-=6}
 }
 sub(l.agenda);items(report.agenda || report.reviewedAt ? noteBlocks(report.agenda).map(n=>n.text) : topics(report.notes).map(g=>g.title).filter(Boolean));
 section(1);table([l.subject,l.finding],[145,379],data.findings.map(g=>[g.title||l.finding,g.text.join('\n')]));
 section(2);items(data.recommendations);
 section(3);actionTable(data.client);if(data.unassigned.length){sub(l.other);actionTable(data.unassigned)}
 section(4);actionTable(data.advisor);
 section(5);items(data.next.length?data.next:data.actions.map(a=>(a.owner?a.owner+' · ':'')+a.task));
 section(6);table([l.subject,l.finding],[145,379],l.teams.map((label,i)=>[label,data.swot[i].join('\n')||l.empty]));
 section(7);
 if(data.synthesis.length)items(data.synthesis);
 else {
  const evidence=data.swot.map((rows,i)=>({rows,label:l.teams[i]})).filter(group=>group.rows.length);
  if(evidence.length>=2)table([l.subject,l.finding],[145,379],evidence.map(group=>[group.label,group.rows[0]]));
  else blocks(report.overview||l.empty);
 }
 section(8);
 const scheduled=data.plan.some(g=>g.length);
 if(!scheduled&&!data.unscheduled.length)paragraph(l.empty,body,10,muted);
 for(const [i,week] of data.plan.entries())if(week.length){sub(l.week+' '+(i+1));actionTable(week)}
 if(data.unscheduled.length){sub(l.week+' · '+l.pending);actionTable(data.unscheduled)}
 section(9);table([l.goal,l.indicator],[328,196],data.goals.map(g=>[g,g.match(/(?:indicador(?: de sucesso| de éxito)?|KPI|success measure)\s*[:–-]\s*(.+)/i)?.[1]||l.pending]));
 if(includeTranscript&&t?.sentences?.length){
  newPage();paragraph(l.transcript,serif,24,green);y-=8;
  for(const s of t.sentences){const secs=Math.max(0,Math.floor(s.start_time||0));ensure(38);
   paragraph((s.speaker_name||l.speaker)+' · '+Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'),strong,9,muted);
   paragraph(s.text);y-=7;
  }
 }
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawRectangle({x:0,y:0,width:612,height:46,color:tint});p.drawText('Amanda Alves Realtor  ·  '+l.footer,{x:left,y:25,size:8,font:body,color:green});p.drawText((i+1)+' / '+pages.length,{x:531,y:25,size:8,font:strong,color:green})});
 return doc.save();
}
