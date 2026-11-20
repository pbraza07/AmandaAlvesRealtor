'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {Localized} from '@/components/SiteLanguage';
import {InstagramLink} from './InstagramLink';

export function Nav({instagram,cta,onLead}:{instagram:string;cta:string;onLead:(type?:'BUYER'|'SELLER')=>void}){
 const [open,setOpen]=useState(false);
 const pathname=usePathname();
 const close=()=>setOpen(false);
 useEffect(()=>{if(!open)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);document.getElementById('site-menu-toggle')?.focus()}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[open]);
 const links=[{href:'/',label:'Home',current:pathname==='/'},{href:'/#destinations',label:'Destinations',current:pathname==='/lifestyle'},{href:'/lifestyle/florida#buy',label:'Florida Buy / Sell',current:pathname==='/lifestyle/florida'},{href:'/#travel',label:'Travel',current:false},{href:'/bio',label:'Meet Amanda',current:pathname==='/bio'},{href:'/#contact',label:'Contact',current:false}];
 return <Localized><nav className={`nav site-nav ${open?'open':''}`} aria-label="Main navigation"><div className="container nav-inner">
  <div className="brand-lockup"><a className="brand" href="/" onClick={close} aria-label="Amanda Alves Realtor home"><span>Amanda Alves</span><small>Realtor®</small></a><img className="nav-brokerage-logo" src="/images/agile-group-logo-dark.webp" alt="Agile Group" width="80" height="48"/></div>
  <button type="button" className="menu-button" id="site-menu-toggle" aria-label={open?'Close menu':'Open menu'} aria-controls="site-navigation-links" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span className="menu-label">Menu</span><span className="menu-lines" aria-hidden="true"><i/><i/></span></button>
  <div className="nav-links" id="site-navigation-links">{links.map(link=><a key={link.href} href={link.href} onClick={close} aria-current={link.current?'page':undefined}>{link.label}</a>)}<div className="nav-mobile-actions"><InstagramLink href={instagram}>Instagram</InstagramLink><button className="button dark" onClick={()=>{close();onLead()}}>{cta}</button></div></div>
  <div className="nav-actions"><InstagramLink href={instagram} className="nav-instagram"/><button className="button dark nav-consultation" onClick={()=>{close();onLead()}}>{cta}</button></div>
 </div></nav></Localized>;
}
