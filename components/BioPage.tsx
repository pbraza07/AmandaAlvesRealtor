"use client";
import { useState } from "react";
import type { SiteContentData } from "@/lib/content";
import { Nav } from "./Nav";
import { LeadForm } from "./LeadForm";

export function BioPage({content:c}:{content:SiteContentData}) {
 const [open,setOpen]=useState(false);
 return <><Nav instagram={c.instagramUrl} cta={c.primaryCta} onLead={()=>setOpen(true)}/>
  <main id="main" className="bio-page">
   <header className="container bio-intro"><span className="eyebrow">The person behind your next move</span><h1>Meet Amanda Alves</h1><p>Realtor® · Investor · Wife & Mom</p></header>
   <section className="container bio-story" aria-label="Amanda's biography">
    <figure className="bio-family"><img src="/images/amanda-family-bio.webp" alt="Amanda Alves with her husband and three sons" width={1280} height={1920}/><figcaption>Amanda and her family</figcaption></figure>
    <div className="bio-text">
     <p>Originally from Brazil, Amanda and her husband moved to the Tampa Bay area with the U.S. Air Force in 2010 and have called it home ever since. Before transitioning into real estate, Amanda built her career in the financial services industry, backed by an education in Business Administration. Licensed since 2020, she is also an active real estate investor with experience in new construction and house flips. Her background in finance, along with her own investing experience, gives her a practical understanding of real estate from both sides of the equation, helping clients make confident, informed decisions.</p>
     <p>Amanda has a passion for acreage and lifestyle properties, particularly in the communities north of Tampa, including Wesley Chapel, Lutz, Land O’ Lakes, Odessa, San Antonio, and Dade City. She knows these areas well and loves helping families find a home that fits the way they actually live, whether that means more land, more privacy, or simply a place that feels right.</p>
     <p>Outside of real estate, Amanda is a wife and mom to three boys, which means much of her free time is spent on soccer fields cheering them on. She's also an avid traveler who loves discovering new places, experiencing different cultures, and making memories along the way. Having lived abroad herself, she values the experiences that come with exploring the world and believes in enjoying life today while still planning for the future.</p>
     <p>At the heart of it all, Amanda believes real estate is about more than buying and selling properties. Whether it's finding the right place to call home or making a smart investment, she loves helping people see the possibilities real estate can create and how it can help them build a life they truly love.</p>
     <div className="actions"><button className="button dark" onClick={()=>setOpen(true)}>{c.primaryCta}</button><a className="button outline" href="/#contact">Contact Me</a></div>
    </div>
   </section>
  </main>
  <footer className="footer"><div className="container"><div className="footer-brand-lockup"><h3>Amanda Alves, Realtor®</h3><img className="footer-brokerage-logo" src="/images/agile-group-logo-white.webp" alt="Agile Group"/></div><p>{c.brokerageName}<br/>{c.brokerageContact}<br/>Florida license: {c.licenseNumber}</p><p>Equal Housing Opportunity · <a href="/">Home</a> · <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a> · <a href="/accessibility">Accessibility</a></p><div className="legal-note">{c.disclosureText}<br/>© {new Date().getFullYear()} Amanda Alves. All rights reserved.</div></div></footer>
  <LeadForm open={open} onClose={()=>setOpen(false)}/>
 </>;
}
