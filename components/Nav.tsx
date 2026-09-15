"use client";
import { useState } from "react";

export function Nav({ instagram, cta, onLead }: { instagram:string; cta:string; onLead:(type?:"BUYER"|"SELLER")=>void }) {
  const [open,setOpen]=useState(false);
  const close=()=>setOpen(false);
  return <nav className={`nav ${open?"open":""}`} aria-label="Main navigation"><div className="container nav-inner">
    <a className="brand" href="#home" onClick={close}>Amanda Alves <small>Realtor®</small></a>
    <button className="menu-button" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button>
    <div className="nav-links"><a href="#home" onClick={close}>Home</a><a href="#about" onClick={close}>About</a><a href="#buy" onClick={close}>Buy</a><a href="#sell" onClick={close}>Sell</a><a href="#contact" onClick={close}>Contact</a>{instagram && !instagram.startsWith("[") && <a className="instagram" href={instagram} target="_blank" rel="noreferrer" aria-label="Amanda on Instagram">◎ Instagram</a>}<button className="button dark" onClick={()=>{close();onLead()}}>{cta}</button></div>
  </div></nav>;
}
