export type ListingTour={id:string;title:string;description:string;url:string;autoplayUrl?:string;embed?:boolean};
export type ListingSettings={enabled:boolean;tours:ListingTour[]};
export const emptyListings:ListingSettings={enabled:false,tours:[]};

export function videoSource(value:string,autoplay=true){
 let url:URL;
 try{url=new URL(value)}catch{return null}
 if(url.protocol!=='https:'||url.username||url.password)return null;
 const host=url.hostname.toLowerCase().replace(/^www\./,'');
 const parts=url.pathname.split('/').filter(Boolean);
 const play=autoplay?'1':'0';
 const youtubeId=host==='youtu.be'?parts[0]:['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)?
   (parts[0]==='watch'?url.searchParams.get('v'):['shorts','live','embed'].includes(parts[0])?parts[1]:null):null;
 if(youtubeId && /^[\w-]{11}$/.test(youtubeId))return {kind:'youtube',src:'https://www.youtube-nocookie.com/embed/'+youtubeId+'?autoplay='+play+'&mute=1&playsinline=1'};
 if(host==='instagram.com'&&['p','reel','reels','tv'].includes(parts[0])&&/^[\w-]+$/.test(parts[1]||''))return {kind:'instagram',src:'https://www.instagram.com/'+(parts[0]==='reels'?'reel':parts[0])+'/'+parts[1]+'/embed/'};
 if(host==='vimeo.com'||host==='player.vimeo.com'){
   const i=parts[0]==='video'?1:0;
   if(/^\d+$/.test(parts[i]||'')){
     const embed=new URL('https://player.vimeo.com/video/'+parts[i]);
     const hash=url.searchParams.get('h')||parts[i+1];
     if(hash&&/^\w+$/.test(hash))embed.searchParams.set('h',hash);
     embed.searchParams.set('autoplay',play);embed.searchParams.set('muted','1');
     return {kind:'vimeo',src:embed.href};
   }
 }
 if(/\.(mp4|webm|ogv|m4v)$/i.test(url.pathname))return {kind:'file',src:url.href};
 return {kind:'link',src:url.href};
}

export function autoplaySource(url:string,autoplay=true){
 const video=videoSource(url,autoplay);
 return video && ['file','youtube','vimeo'].includes(video.kind)?video:null;
}

export function listingPlayer(listing:ListingTour,autoplay=true){
 const source=videoSource(listing.url,autoplay);
 if(source?.kind==='instagram' && listing.autoplayUrl)return autoplaySource(listing.autoplayUrl,autoplay)||source;
 if(source?.kind==='link' && listing.embed)return {kind:'embed',src:source.src};
 return source;
}
