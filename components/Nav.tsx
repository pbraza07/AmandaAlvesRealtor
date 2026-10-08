"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Nav({ instagram, cta, onLead }: { instagram:string; cta:string; onLead:(type?:"BUYER"|"SELLER")=>void }) {
  const [open,setOpen]=useState(false);
  const pathname=usePathname();
  const home=pathname==="/"?"":"/";
  const close=()=>setOpen(false);
  return <nav className={`nav ${open?"open":""}`} aria-label="Main navigation"><div className="container nav-inner">
    <div className="brand-lockup"><a className="brand" href={`${home}#home`} onClick={close}>Amanda Alves <small>Realtor®</small></a><img className="nav-brokerage-logo" src="/images/agile-group-logo-dark.webp" alt="Agile Group"/></div>
    <button className="menu-button" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button>
    <div className="nav-links"><a href={`${home}#home`} onClick={close}>Home</a><a href={`${home}#about`} onClick={close}>About</a><a href="/bio" onClick={close} aria-current={pathname==="/bio"?"page":undefined}>Bio</a><a href={`${home}#buy`} onClick={close}>Buy</a><a href={`${home}#sell`} onClick={close}>Sell</a><a href={`${home}#contact`} onClick={close}>Contact</a>{instagram && !instagram.startsWith("[") && <a className="instagram" href={instagram} target="_blank" rel="noreferrer" aria-label="Amanda on Instagram">◎ Instagram</a>}<button className="button dark" onClick={()=>{close();onLead()}}>{cta}</button></div>
  </div></nav>;
}
