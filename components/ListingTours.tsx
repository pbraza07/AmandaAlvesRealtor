'use client';
import {useEffect,useRef,useState} from 'react';
import {autoplaySource,videoSource,type ListingTour} from '@/lib/listing-tour';
import styles from './ListingTours.module.css';

export function ListingTours({tours}:{tours:ListingTour[]}){
 const [index,select]=useState(0),[visible,setVisible]=useState(false),[autoplay,setAutoplay]=useState(false);
 const area=useRef<HTMLElement>(null);
 useEffect(()=>{
   setAutoplay(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
   if(!area.current||!('IntersectionObserver' in window)){setVisible(true);return}
   const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}});observer.observe(area.current);return ()=>observer.disconnect();
 },[]);
 const listing=tours[index]||tours[0];if(!listing)return null;
 const original=videoSource(listing.url,autoplay);if(!original)return null;
 const instagram=original.kind==='instagram';
 const video=(instagram&&listing.autoplayUrl?autoplaySource(listing.autoplayUrl,autoplay):null)||original;
 return <section className={styles.section} ref={area} aria-label="Featured listings"><div className={'container '+styles.grid}>
   <div><span className="eyebrow">Featured listings</span><h2>{listing.title}</h2>{listing.description&&<p>{listing.description}</p>}
     <a className="button dark" href={listing.url} target="_blank" rel="noopener noreferrer">{instagram&&<img src="/images/instagram.png" alt="" width="22" height="22" style={{borderRadius:6,marginRight:8}}/>}{instagram?'View on Instagram ↗':'Watch property tour ↗'}</a>
     {tours.length>1&&<div className={styles.selector}><label>Choose a listing<select value={listing.id} onChange={e=>select(tours.findIndex(t=>t.id===e.target.value))}>{tours.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label></div>}
   </div>
   {video.kind!=='link'&&<div key={listing.id} className={instagram?styles.reel:styles.player}>{visible&&(video.kind==='file'?<video src={video.src} autoPlay={autoplay} muted playsInline controls preload="metadata" aria-label={listing.title}/>:<iframe src={video.src} title={listing.title+' · Property tour'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>)}</div>}
 </div></section>
}
