"use client";
import { useState } from "react";
import type { SiteContentData } from "@/lib/content";
import { Nav } from "./Nav";
import { LeadForm } from "./LeadForm";

export function BioPage({content:c}:{content:SiteContentData}) {
 const [open,setOpen]=useState(false);
 return <><Nav instagram={c.instagramUrl} cta={c.primaryCta} onLead={()=>setOpen(true)}/>
  <main id="main" className="bio-page">
   <header className="container bio-intro"><span className="eyebrow">{c.bioEyebrow}</span><h1>{c.bioHeading}</h1><p>{c.bioSubtitle}</p></header>
   <section className="container bio-story" aria-label="Amanda's biography">
    <figure className="bio-family">{c.bioImageUrl&&<img src={c.bioImageUrl} alt={c.bioImageAlt}/>}<figcaption>{c.bioImageCaption}</figcaption></figure>
    <div className="bio-text">
     {c.bioBody.split(/\n\s*\n/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}
     <div className="actions"><button className="button dark" onClick={()=>setOpen(true)}>{c.bioCta}</button><a className="button outline" href="/#contact">{c.bioContactLabel}</a></div>
    </div>
   </section>
  </main>
  <footer className="footer"><div className="container"><div className="footer-brand-lockup"><h3>Amanda Alves, Realtor®</h3><img className="footer-brokerage-logo" src="/images/agile-group-logo-white.webp" alt="Agile Group"/></div><p>{c.brokerageName}<br/>{c.brokerageContact}<br/>Florida license: {c.licenseNumber}</p><p>Equal Housing Opportunity · <a href="/">Home</a> · <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a> · <a href="/accessibility">Accessibility</a></p><div className="legal-note">{c.disclosureText}<br/>© {new Date().getFullYear()} Amanda Alves. All rights reserved.</div></div></footer>
  <LeadForm open={open} onClose={()=>setOpen(false)}/>
 </>;
}
