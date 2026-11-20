'use client';

import {useEffect,useRef,useState} from 'react';
import {version} from 'pdfjs-dist/package.json';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import type {ReportLanguage} from '@/lib/report-language';
import styles from './MeetingPdfViewer.module.css';

const strings={
 en:{back:'Back',share:'Share PDF',download:'Download PDF',previous:'Previous page',next:'Next page',page:'Page',of:'of',loading:'Opening PDF…',failed:'The preview could not be displayed.',unavailable:'The PDF could not be loaded. Return to Meeting Studio and sign in again if needed.',fallback:'Download the PDF and attach it to an email or message.',close:'Close',retry:'Try again'},
 pt:{back:'Voltar',share:'Compartilhar PDF',download:'Baixar PDF',previous:'Página anterior',next:'Próxima página',page:'Página',of:'de',loading:'Abrindo PDF…',failed:'Não foi possível exibir a prévia.',unavailable:'Não foi possível carregar o PDF. Volte ao Meeting Studio e entre novamente, se necessário.',fallback:'Baixe o PDF e anexe o arquivo a um e-mail ou mensagem.',close:'Fechar',retry:'Tentar novamente'},
 es:{back:'Volver',share:'Compartir PDF',download:'Descargar PDF',previous:'Página anterior',next:'Página siguiente',page:'Página',of:'de',loading:'Abriendo PDF…',failed:'No se pudo mostrar la vista previa.',unavailable:'No se pudo cargar el PDF. Vuelva a Meeting Studio e inicie sesión de nuevo si es necesario.',fallback:'Descargue el PDF y adjúntelo a un correo o mensaje.',close:'Cerrar',retry:'Volver a intentar'}
};
type Attachment={file:File;url:string};
export function MeetingPdfViewer({id,title,language,transcript}:{id:string;title:string;language:ReportLanguage;transcript:boolean}){
 const l=strings[language];
 const back='/admin/meetings?report='+encodeURIComponent(id)+(transcript?'&transcript=1':'');
 const src='/api/admin/meetings/'+encodeURIComponent(id)+'/pdf?download=1'+(transcript?'&transcript=1':'');
 const [doc,setDoc]=useState<PDFDocumentProxy|null>(null),[attachment,setAttachment]=useState<Attachment|null>(null);
 const [num,setNum]=useState(1),[width,setWidth]=useState(0),[text,setText]=useState(''),[failed,setFailed]=useState(false),[fallback,setFallback]=useState(false),[attempt,setAttempt]=useState(0);
 const surface=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const holder=surface.current;
  if(!holder)return;
  const observer=new ResizeObserver(()=>setWidth(holder.clientWidth));
  observer.observe(holder);
  return ()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  const controller=new AbortController();
  let objectUrl='',task:ReturnType<typeof import('pdfjs-dist')['getDocument']>|undefined;
  setAttachment(null);setDoc(null);setFailed(false);setNum(1);setFallback(false);
  async function load(){
   const response=await fetch(src,{signal:controller.signal,cache:'no-store'});
   if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))throw Error('Unavailable');
   const blob=await response.blob();
   if(controller.signal.aborted)return;
   const filename=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/i)?.[1]||'Amanda-Alves.pdf';
   const file=new File([blob],filename,{type:'application/pdf'});
   objectUrl=URL.createObjectURL(file);setAttachment({file,url:objectUrl});
   const base='/pdf-reader/'+version+'/';
   const reader=await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ base+'pdf.min.mjs') as typeof import('pdfjs-dist');
   const data=await file.arrayBuffer();
   if(controller.signal.aborted)return;
   reader.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';
   task=reader.getDocument({data,standardFontDataUrl:base+'standard_fonts/',useWasm:false});
   const loaded=await task.promise;
   if(!controller.signal.aborted)setDoc(loaded);
  }
  load().catch(()=>{if(!controller.signal.aborted)setFailed(true)});
  return ()=>{controller.abort();if(task)void task.destroy().catch(()=>{});if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[src,attempt]);
 useEffect(()=>{
  if(!doc||!canvas.current||width===0)return;
  let active=true,render:RenderTask|undefined;
  // Each render owns its canvas so a cancelled resize cannot paint over another page.
  const target=canvas.current;
  async function draw(pdf:PDFDocumentProxy){
   const page=await pdf.getPage(num);
   if(!active)return;
   const viewport=page.getViewport({scale:width/page.getViewport({scale:1}).width});
   const dpr=Math.min(window.devicePixelRatio||1,2);
   target.width=Math.round(viewport.width*dpr);target.height=Math.round(viewport.height*dpr);
   render=page.render({canvas:target,viewport,transform:[dpr,0,0,dpr,0,0]});
   await render.promise;
   const content=await page.getTextContent();
   if(active)setText(content.items.map(item=>'str' in item?item.str:'').join(' '));
  }
  setText('');
  draw(doc).catch(()=>{if(active)setFailed(true)});
  return ()=>{active=false;render?.cancel()};
 },[doc,num,width]);
 async function share(){
  if(!attachment)return;
  const data={files:[attachment.file],title};
  try{
   if(!navigator.canShare?.({files:data.files})||!navigator.share){setFallback(true);return}
   await navigator.share(data);
  }catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setFallback(true)}
 }
 function move(to:number){setNum(to);window.scrollTo(0,0)}
 return <main className={styles.reader} lang={language}>
  <header className={styles.bar}>
   <div className={styles.row}>
    <a href={back} onClick={e=>{
     if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&document.referrer&&new URL(document.referrer).origin===window.location.origin&&history.length>1){
      e.preventDefault();history.back();
     }
    }}>← {l.back}</a>
    <h1>{title}</h1>
    <button className={styles.share} onClick={share} disabled={!attachment}>{l.share}</button>
   </div>
   <div className={styles.navigation}>
    <button aria-label={l.previous} disabled={!doc||num===1} onClick={()=>move(num-1)}>←</button>
    <span aria-live="polite">{doc?l.page+' '+num+' '+l.of+' '+doc.numPages:failed?'PDF':l.loading}</span>
    <button aria-label={l.next} disabled={!doc||num===doc.numPages} onClick={()=>move(num+1)}>→</button>
    {attachment&&<a href={attachment.url} download={attachment.file.name}>{l.download}</a>}
   </div>
   {fallback&&<div className={styles.message} role="status"><span>{l.fallback}</span><button onClick={()=>setFallback(false)}>{l.close}</button></div>}
  </header>
  <div className={styles.sheet} ref={surface}>
   {failed?<p role="alert">{attachment?l.failed:l.unavailable} <button onClick={()=>setAttempt(a=>a+1)}>{l.retry}</button></p>:<>
    <canvas key={num+'-'+width} ref={canvas} aria-hidden="true"/>
    <p className={styles.srOnly}>{text}</p>
   </>}
  </div>
 </main>;
}
