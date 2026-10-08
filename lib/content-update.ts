import { defaultContent, type SiteContentData } from './content';
import { clean } from './security';
export function sanitizeContentUpdate(input:Partial<SiteContentData>,existing:Partial<SiteContentData>={}):SiteContentData {
 return Object.fromEntries(Object.keys(defaultContent).map(name=>{
  const key=name as keyof SiteContentData;
  const value=input[key]??existing[key]??defaultContent[key];
  if(key==='bioImageUrl'){
   const image=String(value).trim();
   if(image.length>1500000||image&&!/^\/[^/]|^https?:\/\/|^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image))throw new Error('Choose a valid image URL or upload a JPG, PNG, or WebP image.');
   return [key,image];
  }
  return [key,clean(value,key==='bioBody'||key.includes('Bio')||key.includes('Text')||key.includes('Template')?12000:1000)];
 })) as SiteContentData;
}
