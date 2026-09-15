import type { MetadataRoute } from "next";
export default function sitemap():MetadataRoute.Sitemap{const b=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";return["","/privacy","/terms","/accessibility"].map((p,i)=>({url:b+p,lastModified:new Date(),changeFrequency:i?"yearly":"weekly",priority:i?.4:1}))}
