'use client';
import {useEffect,useRef,useState} from 'react';
import {listingPlayer,videoSource,type ListingTour} from '@/lib/listing-tour';
import {useSiteLanguage} from './SiteLanguage';
import styles from './ListingTours.module.css';

function TourCard({listing,featured}:{listing:ListingTour;featured:boolean}){
 const {t}=useSiteLanguage();
 const media=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false);
 const [autoplay,setAutoplay]=useState(false);
 useEffect(()=>{
   setAutoplay(featured&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
   if(!media.current||!('IntersectionObserver' in window)){setVisible(true);return}
   const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:0.05});
   observer.observe(media.current);
   return ()=>observer.disconnect();
 },[featured]);
 const original=videoSource(listing.url);
 const video=listingPlayer(listing,autoplay);
 if(!original||!video)return null;
 const instagram=original.kind==='instagram';
 return <article className={styles.card}>
   <div className={styles.media} ref={media}>
     {video.kind==='link'?<a className={styles.play} href={listing.url} target="_blank" rel="noopener noreferrer" aria-label={'Watch '+listing.title}><span aria-hidden="true">▶</span></a>
      :visible&&(video.kind==='file'?<video src={video.src} autoPlay={autoplay} muted playsInline controls preload="metadata" aria-label={listing.title}/>
      :<iframe sandbox={video.kind==='embed'?'allow-scripts allow-presentation':undefined} src={video.src} title={listing.title+' · Property tour'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>)}
   </div>
   <div className={styles.caption}><h3>{listing.title}</h3>{listing.description&&<p>{listing.description}</p>}
   <a href={listing.url} target="_blank" rel="noopener noreferrer">{instagram&&<img src="/images/instagram.png" alt="" width="19" height="19"/>}{t(instagram?'View on Instagram ↗':'Watch property tour ↗')}</a></div>
 </article>
}

export function ListingTours({tours}:{tours:ListingTour[]}){
 const {t}=useSiteLanguage();
 const track=useRef<HTMLDivElement>(null);
 const [edges,setEdges]=useState({previous:false,next:false});
 useEffect(()=>{
   const row=track.current;if(!row)return;
   function measure(){
     if(!row)return;
     const previous=row.scrollLeft>2,next=row.scrollLeft+row.clientWidth<row.scrollWidth-2;
     setEdges(old=>old.previous===previous&&old.next===next?old:{previous,next});
   }
   measure();const resize=new ResizeObserver(measure);resize.observe(row);
   row.addEventListener('scroll',measure,{passive:true});
   return ()=>{resize.disconnect();row.removeEventListener('scroll',measure)};
 },[tours.length]);
 function move(direction:number){
   const row=track.current;if(!row||!row.firstElementChild)return;
   const step=row.firstElementChild.getBoundingClientRect().width+parseFloat(getComputedStyle(row).columnGap);
   row.scrollBy({left:direction*step,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 if(!tours.length)return null;
 return <section className={styles.section} aria-labelledby="featured-listings-title"><div className="container">
   <header className={styles.header}><h2 id="featured-listings-title">{t('Featured listings')}</h2>
   {(edges.previous||edges.next)&&<div className={styles.controls}>
    <button type="button" aria-label={t('Previous listing')} disabled={!edges.previous} onClick={()=>move(-1)}>←</button>
    <button type="button" aria-label={t('Next listing')} disabled={!edges.next} onClick={()=>move(1)}>→</button>
   </div>}</header>
   <div ref={track} className={styles.track} role="region" aria-label={t('Property tours')} tabIndex={0}>
    {tours.map((listing,index)=><TourCard key={listing.id} listing={listing} featured={index===0}/>)}
   </div>
 </div></section>
}
