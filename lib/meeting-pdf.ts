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
 let page:PDFPage,y=0;
 function newPage(){page=doc.addPage([612,792]);page.drawRectangle({x:0,y:780,width:612,height:12,color:GREEN});page.drawText('Amanda Alves',{x:44,y:742,size:23,font:strong,color:GREEN});page.drawText('R E A L T O R',{x:45,y:724,size:10,font,color:GREEN});page.drawLine({start:{x:44,y:708},end:{x:568,y:708},thickness:1.5,color:GOLD});const dims=image.scaleToFit(90,38);page.drawImage(image,{x:568-dims.width,y:728,width:dims.width,height:dims.height});y=680}
 function line(s:string,size=10.5,f:PDFFont=font,color=INK){if(y<65)newPage();page.drawText(safe(s),{x:44,y,size,font:f,color});y-=size*1.55}
 function text(value:string,size=10.5,f:PDFFont=font){for(const raw of safe(value).replace(/\*\*/g,'').split('\n')){if(!raw.trim()){y-=7;continue}let current='';for(const word of raw.trim().split(/\s+/)){if(f.widthOfTextAtSize(current?current+' '+word:word,size)<=524){current=current?current+' '+word:word;continue}if(current)line(current,size,f);current='';for(const ch of word){if(f.widthOfTextAtSize(current+ch,size)>524){line(current,size,f);current=''}current+=ch}}if(current)line(current,size,f)}}
 function section(title:string,value:string,empty:string){if(y<125)newPage();y-=16;page.drawRectangle({x:44,y:y-6,width:524,height:25,color:SAGE});page.drawText(title,{x:53,y:y+2,size:12,font:strong,color:GREEN});y-=28;text(value.trim()||empty)}
 newPage();text(report.title,21,strong);y-=6;
 const t=report.transcript as FirefliesTranscript|null;
 const meetingDate=t?.date?new Date(t.date):report.createdAt;
 text(`Meeting date: ${meetingDate.toLocaleDateString('en-US',{timeZone:'America/New_York',year:'numeric',month:'long',day:'numeric'})}`,10);
 if(t?.duration)text(`Duration: ${Math.round(t.duration)} minutes`,10);
 if(t?.speakers?.length)text(`Participants: ${t.speakers.map(s=>s.name).join(', ')}`,10);
 text(report.reviewedAt?'Owner-reviewed meeting report':'AI draft - review details before sharing',10,strong);
 section('Meeting overview',report.overview,'No overview was returned by Fireflies.');
 section('Agenda / topics discussed',report.agenda,'No agenda was provided. Add topics during review.');
 section('Discussion notes',report.notes,'No detailed notes were returned.');
 section('Action items & follow-up',report.actionItems,'No action items were identified.');
 y-=8;text('Owners and deadlines are included only when stated in the notes. Confirm assignments and dates before acting.',9);
 if(includeTranscript&&t?.sentences?.length){section('Transcript','','');for(const s of t.sentences){const min=Math.floor(s.start_time/60),sec=Math.floor(s.start_time%60);text(`[${min}:${String(sec).padStart(2,'0')}] ${s.speaker_name||'Speaker'}: ${s.text}`);y-=3}}
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:44,y:47},end:{x:568,y:47},thickness:1,color:GOLD});p.drawText('Amanda Alves Realtor | Private meeting notes',{x:44,y:30,size:8,font,color:GREEN});p.drawText(`${i+1} / ${pages.length}`,{x:533,y:30,size:8,font,color:GREEN})});
 return doc.save();
}
