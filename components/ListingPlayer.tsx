'use client';
import {useState} from 'react';
import type {listingPlayer} from '@/lib/listing-tour';
import {useSiteLanguage} from './SiteLanguage';
import styles from './ListingTours.module.css';

type Player = NonNullable<ReturnType<typeof listingPlayer>>;

export function ListingPlayer({video,title,autoplay=false}:{video:Player;title:string;autoplay?:boolean}){
 const {t}=useSiteLanguage();
 const [failedUrl,setFailedUrl]=useState('');
 if(video.kind==='link'||video.src===failedUrl){
   return <p className={styles.unavailable} role="status">{t('Inline playback is unavailable for this tour.')}</p>;
 }
 if(video.kind==='file'){
   return <video src={video.src} autoPlay={autoplay} muted playsInline controls preload="metadata"
     aria-label={title} onError={()=>setFailedUrl(video.src)}/>;
 }
 // Only the recognized provider players need access to their own origin.
 // No player can open popups or navigate the containing page.
 const sandbox=video.kind==='embed'?'allow-scripts allow-presentation':'allow-scripts allow-same-origin allow-presentation';
 return <iframe sandbox={sandbox} src={video.src} title={title+' · '+t('Property tour')}
   allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
}
