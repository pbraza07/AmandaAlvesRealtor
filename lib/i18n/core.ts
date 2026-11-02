import translations from './translations.json';
export const locales=['en','es','pt'] as const;
export type Locale=typeof locales[number];
export const languageNames={en:'English',es:'Español',pt:'Português'} as const;
export function validLocale(value:unknown):Locale{return value==='es'||value==='pt'?value:'en'}
export function translate(text:string,locale:Locale):string {
 if(locale==='en'||!text.trim())return text;
 const leading=text.match(/^\s*/)?.[0]||'', trailing=text.match(/\s*$/)?.[0]||'';
 const key=text.trim().replace(/\s+/g,' ');
 const dictionary=translations as Record<string,{es:string;pt:string}>;
 const entry=dictionary[key];
 if(entry)return leading+entry[locale]+trailing;
 // Dynamic display fragments retain canonical data and numbers.
 const rules:[RegExp,(...parts:string[])=>string][]=[
 [/^(\d+)% match$/,n=>locale==='es'?`${n}% de coincidencia`:`${n}% de compatibilidade`],
 [/^(\d+) of (\d+) preferences$/,(a,b)=>locale==='es'?`${a} de ${b} ${b==='1'?'preferencia':'preferencias'}`:`${a} de ${b} ${b==='1'?'preferência':'preferências'}`],
 [/^· (\d+) (preference|preferences)$/,n=>locale==='es'?`· ${n} ${n==='1'?'preferencia':'preferencias'}`:`· ${n} ${n==='1'?'preferência':'preferências'}`],
 [/^(.+) Lifestyle Real Estate \| Amanda Alves$/,p=>`${translate(p,locale)} | ${locale==='es'?'Bienes raíces y estilo de vida':'Imóveis e estilo de vida'} | Amanda Alves`],
 [/^Lifestyle destinations \/ (.+)$/,p=>`${locale==='es'?'Destinos y estilo de vida':'Destinos e estilo de vida'} / ${translate(p,locale)}`],
 [/^Search (.+)…$/,p=>`${locale==='es'?'Buscar':'Buscar'} ${translate(p,locale)}…`],
 [/^Explore the (.+) Map$/,p=>`${locale==='es'?'Explorar el mapa de':'Explorar o mapa de'} ${translate(p,locale)}`],
 [/^Matching places in (.+)$/,p=>`${locale==='es'?'Lugares compatibles en':'Lugares compatíveis em'} ${translate(p,locale)}`],
 [/^Interactive map of matching places in (.+)$/,p=>`${locale==='es'?'Mapa interactivo de lugares compatibles en':'Mapa interativo de lugares compatíveis em'} ${translate(p,locale)}`],
 [/^(Explore|Save|Unsave|Talk to Amanda about) (.+)$/,(action,p)=>`${translate(action,locale)} ${translate(p,locale)}`],
 [/^Official (.+) guide$/,p=>`${locale==='es'?'Guía oficial de':'Guia oficial de'} ${translate(p,locale)}`],
 [/^(.+) city overview \(Wikipedia\)$/,p=>`${locale==='es'?'Información sobre':'Informações sobre'} ${translate(p,locale)} (Wikipedia)`],
 [/^(.+) area guide$/,p=>`${locale==='es'?'Guía de':'Guia de'} ${translate(p,locale)}`],
 [/^Remove (.+) filter$/,p=>`${locale==='es'?'Quitar filtro':'Remover filtro'} ${translate(p,locale)}`],
 [/^(.+) · about (\d+) km straight line( · plan a longer ground transfer)?\. Check routes and seasonal flights\.$/,(airport,km,long)=>`${translate(airport,locale)} · ${locale==='es'?'aproximadamente':'aproximadamente'} ${km} km ${locale==='es'?'en línea recta':'em linha reta'}${long?(locale==='es'?' · prevé un traslado terrestre más largo':' · planeje um traslado terrestre mais longo'):''}. ${locale==='es'?'Consulta las rutas y los vuelos de temporada.':'Confira as rotas e os voos sazonais.'}`]
 ];
 for(const [pattern,render] of rules){const m=key.match(pattern);if(m)return leading+render(...m.slice(1))+trailing}
 // Paragraphs, combined preference lists, and icon labels are composed from translated source phrases.
 for(const separator of ['\n\n',', ',' · ',': ',' | ']){
  if(text.includes(separator)){const parts=text.split(separator);const result=parts.map(p=>translate(p,locale));if(result.some((p,i)=>p!==parts[i]))return result.join(separator)}
 }
 for(const icon of ['⌂ ','◇ ','← ','· ','≈ '])if(key.startsWith(icon))return leading+icon+translate(key.slice(icon.length),locale)+trailing;
 if(key.endsWith(' *'))return leading+translate(key.slice(0,-2),locale)+' *'+trailing;
 return text;
}
