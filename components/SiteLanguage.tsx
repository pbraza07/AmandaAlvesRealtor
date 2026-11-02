"use client";
import { cloneElement,createContext,isValidElement,useContext,useEffect,useState,type ReactNode,type ReactElement } from 'react';
import {usePathname} from 'next/navigation';
import {translate,languageNames,type Locale} from '@/lib/i18n/core';
type LanguageContext={locale:Locale;setLocale:(locale:Locale)=>void;t:(text:string)=>string};
const Context=createContext<LanguageContext>({locale:'en',setLocale:()=>{},t:text=>text});
export const useSiteLanguage=()=>useContext(Context);

// Translate React-owned content before reconciliation, never mutate the rendered DOM.
// Form values, event handlers, IDs, URLs, branding, and visitor-entered text stay intact.
export function localizeTree(node:ReactNode,locale:Locale):ReactNode {
 if(typeof node==='string')return translate(node,locale);
 if(Array.isArray(node))return node.map((child,index)=>{const translated=localizeTree(child,locale);return isValidElement(translated)&&translated.key===null?cloneElement(translated,{key:index}):translated});
 if(!isValidElement(node))return node;
 const element=node as ReactElement<Record<string,unknown>>;
 const p=element.props;
 if(p['data-no-translate']||p.translate==='no'||element.type==='script'||element.type==='style')return node;
 const changed:Record<string,unknown>={};
 for(const key of ['alt','title','aria-label','placeholder'])if(typeof p[key]==='string')changed[key]=translate(p[key] as string,locale);
 if(p.children!==undefined)changed.children=localizeTree(p.children as ReactNode,locale);
 // An <option> without an explicit value inherits its text; preserve the English business value.
 if(element.type==='option'&&p.value===undefined&&typeof p.children==='string')changed.value=p.children;
 return cloneElement(element,changed);
}
export function Localized({children}:{children:ReactNode}){const {locale}=useSiteLanguage();return localizeTree(children,locale)}
export function SiteLanguageProvider({children,initialLocale='en'}:{children:ReactNode;initialLocale?:Locale}){
 const [locale,update]=useState<Locale>(initialLocale);const pathname=usePathname();
 function setLocale(next:Locale){update(next);document.cookie=`amanda-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;try{localStorage.setItem('amanda-language',next)}catch{}}
 useEffect(()=>{
 document.documentElement.lang=locale;
 const country=({'florida':'Florida','spain':'Spain','portugal':'Portugal','costa-rica':'Costa Rica'} as Record<string,string>)[pathname.split('/')[2]];
 const title=country?`${country} Lifestyle Real Estate | Amanda Alves`:pathname==='/living-guides'?'400 Researched City & Town Guides | Amanda Alves':pathname==='/bio'?'Meet Amanda Alves | Tampa Bay Realtor & Investor':'Amanda Alves | Lifestyle Real Estate';
 document.title=translate(title,locale);
 },[locale,pathname]);
 useEffect(()=>{const query=new URLSearchParams(location.search).get('lang');if(query==='en'||query==='es'||query==='pt')setLocale(query)},[]);
 return <Context.Provider value={{locale,setLocale,t:text=>translate(text,locale)}}>{!pathname.startsWith('/admin')&&<div className="site-language-bar" data-no-translate="true"><div className="container"><div className="site-language-switcher" role="group" aria-label={translate('Website language',locale)}>{(['en','es','pt'] as const).map(code=><button type="button" key={code} lang={code} aria-label={languageNames[code]} title={languageNames[code]} aria-pressed={locale===code} onClick={()=>setLocale(code)}><span className="language-flag" aria-hidden="true">{code==='en'?'🇺🇸':code==='es'?'🇪🇸':'🇧🇷'}</span><span>{code.toUpperCase()}</span></button>)}</div></div></div>}{children}</Context.Provider>
}
