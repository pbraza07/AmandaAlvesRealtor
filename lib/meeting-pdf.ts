import {getContent} from './content';
import {noteBlocks,strategicNotes} from './meeting-notes';
import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {FirefliesTranscript} from './fireflies-core';
type Report={title:string;createdAt:Date;overview:string;agenda:string;notes:string;actionItems:string;reviewedAt:Date|null;transcript:unknown};
const GREEN=rgb(24/255,53/255,43/255),GOLD=rgb(197/255,165/255,106/255),INK=rgb(.16,.19,.17),SAGE=rgb(.91,.94,.90),WHITE=rgb(1,1,1);
export async function meetingPdf(report:Report,includeTranscript=false){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);doc.setTitle(report.title);doc.setAuthor('Amanda Alves Realtor');doc.setSubject('Meeting agenda, notes and action items');
 const root=path.join(process.cwd(),'public');
 const [regular,bold,logo]=await Promise.all([readFile(path.join(root,'fonts/DejaVuSans.ttf')),readFile(path.join(root,'fonts/DejaVuSans-Bold.ttf')),readFile(path.join(root,'images/agile-group-logo-dark.webp')).then(b=>sharp(b).png().toBuffer())]);
 const font=await doc.embedFont(regular,{subset:true}),strong=await doc.embedFont(bold,{subset:true}),image=await doc.embedPng(logo);
 const supported=new Set(font.getCharacterSet());const safe=(s:string)=>Array.from(s.normalize('NFC')).filter(c=>c==='\n'||c==='\t'||supported.has(c.codePointAt(0)!)).join('').replace(/\t/g,'  ');
 let page:PDFPage,y=0,left=44;
 function newPage(){page=doc.addPage([612,792]);page.drawRectangle({x:0,y:780,width:612,height:12,color:GREEN});page.drawText('Amanda Alves',{x:44,y:742,size:23,font:strong,color:GREEN});page.drawText('R E A L T O R',{x:45,y:724,size:10,font,color:GREEN});page.drawLine({start:{x:44,y:708},end:{x:568,y:708},thickness:1.5,color:GOLD});const dims=image.scaleToFit(90,38);page.drawImage(image,{x:568-dims.width,y:728,width:dims.width,height:dims.height});y=680}
 function line(s:string,size=10.5,f:PDFFont=font,color=INK){if(y<65)newPage();page.drawText(safe(s),{x:left,y,size,font:f,color});y-=size*1.55}
 function text(value:string,size=10.5,f:PDFFont=font){for(const raw of safe(value).replace(/\*\*/g,'').split('\n')){if(!raw.trim()){y-=7;continue}let current='';for(const word of raw.trim().split(/\s+/)){if(f.widthOfTextAtSize(current?current+' '+word:word,size)<=568-left){current=current?current+' '+word:word;continue}if(current)line(current,size,f);current='';for(const ch of word){if(f.widthOfTextAtSize(current+ch,size)>568-left){line(current,size,f);current=''}current+=ch}}if(current)line(current,size,f)}}
 let sectionNumber=0;
 function section(title:string,value:string,empty=''){
  if(y<155)newPage();
  y-=16;
  page.drawRectangle({x:44,y:y-6,width:524,height:29,color:GREEN});
  page.drawText(String(++sectionNumber).padStart(2,'0'),{x:54,y:y+3,size:11,font:strong,color:GOLD});
  page.drawText(title,{x:83,y:y+2,size:13,font:strong,color:WHITE});
  y-=30;
  for(const block of noteBlocks(value||empty)){
   if(y<(block.heading?110:75))newPage();
   if(block.heading){y-=4;text(block.text,11,strong)}
   else{text((block.bullet?'•  ':'')+block.text);y-=4}
  }
 }
 const t=report.transcript as FirefliesTranscript|null;
 newPage();
 y=579;
 line('PRIVATE MEETING REPORT',11,strong,GREEN);y-=20;
 text(report.title,26,strong);
 y-=18;line('Session details',13,strong,GREEN);
 const meetingDate=t?.date?new Date(t.date):report.createdAt;
 text(meetingDate.toLocaleDateString('en-US',{timeZone:'America/New_York',year:'numeric',month:'long',day:'numeric'}));
 if(t?.duration)text('Duration · '+Math.round(t.duration)+' min');
 if(t?.speakers?.length)text('Participants · '+t.speakers.map(s=>s.name).join(', '));
 y-=20;line('Prepared by Amanda Alves Realtor',12,strong,GREEN);
 const site=await getContent();
 for(const detail of [site.brokerageName,site.email,site.phone])if(detail && !detail.startsWith('['))text(detail,10);
 text(report.reviewedAt?'Owner-reviewed report':'Draft for owner review',10);
 newPage();
 section('Executive summary',report.overview,'No executive summary was recorded.');
 if(t?.summary?.bullet_gist && !report.reviewedAt)section('Key insights',t.summary.bullet_gist);
 section('Session agenda',report.agenda,'No agenda was recorded.');
 const groups=strategicNotes(report.notes);
 if(groups.findings.length)section('Discussion findings and decisions',groups.findings.join('\n'));
 if(groups.risks.length)section('Risks and opportunities',groups.risks.join('\n'));
 section('Commitments and next steps','');
 const tasks=noteBlocks(report.actionItems);
 if(!tasks.length)text('No follow-up commitments were recorded.');
 let actionNumber=0;
 for(const task of tasks){
  if(y<115)newPage();
  if(task.heading){text(task.text,11,strong);y-=4;continue}
  page!.drawText(String(++actionNumber).padStart(2,'0'),{x:46,y,size:11,font:strong,color:GREEN});
  left=80;text(task.text);left=44;
  page!.drawLine({start:{x:44,y:y+1},end:{x:568,y:y+1},thickness:.5,color:GOLD});y-=12;
 }
 if(groups.next.length)section('Next session',groups.next.join('\n'));
 if(groups.goals.length)section('Goals and measures of success',groups.goals.join('\n'));
 if(includeTranscript&&t?.sentences?.length){
  newPage();section('Transcript','');
  for(const s of t.sentences){const min=Math.floor(s.start_time/60),sec=Math.floor(s.start_time%60);text(`[${min}:${String(sec).padStart(2,'0')}] ${s.speaker_name||'Speaker'}: ${s.text}`);y-=3}
 }
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:44,y:47},end:{x:568,y:47},thickness:1,color:GOLD});p.drawText('Amanda Alves Realtor | Private meeting notes',{x:44,y:30,size:8,font,color:GREEN});p.drawText(`${i+1} / ${pages.length}`,{x:533,y:30,size:8,font,color:GREEN})});
 return doc.save();
}
