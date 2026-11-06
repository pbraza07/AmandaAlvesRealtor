/* Owner device alerts only. No fetch handler or private page caching. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{}}catch{}
 const url=typeof payload.url==='string'&&/^\/admin(?:\/leads\/[A-Za-z0-9%-]+)?$/.test(payload.url)?payload.url:'/admin';
 event.waitUntil(self.registration.showNotification(payload.title||'Amanda Alves · New request',{
  body:payload.body||'A new request is ready in your private dashboard.',
  icon:'/admin-icon-192.png',badge:'/icon.svg',tag:payload.tag||'amanda-new-request',data:{url},requireInteraction:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const path=event.notification.data?.url;
 const safe=typeof path==='string'&&/^\/admin(?:\/leads\/[A-Za-z0-9%-]+)?$/.test(path)?path:'/admin';
 const target=new URL(safe,self.location.origin).href;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){const url=new URL(client.url);if(url.origin===self.location.origin&&url.pathname.startsWith('/admin')){await client.navigate(target);return client.focus()}}
  return self.clients.openWindow(target);
 })());
});
