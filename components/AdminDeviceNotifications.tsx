"use client";
import {useEffect,useState} from 'react';
function keyBytes(value:string){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function subscriptionHash(endpoint:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}
async function responseJSON(response:Response){const data=await response.json();if(!response.ok)throw Error(response.status===401?'Please sign in again, then enable notifications.':data.error||'Unable to update device notifications.');return data}
export function AdminDeviceNotifications(){
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false),[publicKey,setPublicKey]=useState(''),[supported,setSupported]=useState(false),[blocked,setBlocked]=useState(false),[homeScreen,setHomeScreen]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  let mounted=true;
  async function sync(){try{
   const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
   const installed=matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone;
   const available=window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
   if(!mounted)return;setHomeScreen(ios&&!installed);setSupported(available&&(!ios||installed));setBlocked(available&&Notification.permission==='denied');
   const subscription=available?await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription():null;
   const suffix=subscription?'?subscription='+await subscriptionHash(subscription.endpoint):'';
   const config=await responseJSON(await fetch('/api/admin/push'+suffix,{cache:'no-store'}));
   if(mounted){setPublicKey(config.publicKey||'');setEnabled(!!subscription&&!!config.enabled)}
  }catch(e){if(mounted)setError(e instanceof Error?e.message:'Unable to check device notifications.')}finally{if(mounted)setLoading(false)}}
  void sync();const focus=()=>{if(!document.hidden)void sync()};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{mounted=false;window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)};
 },[]);
 async function enable(){
  setBusy(true);setError('');setMessage('');let subscription:PushSubscription|null=null;
  try{
   // Permission must follow the owner's click directly, especially on iOS.
   const permission=await Notification.requestPermission();setBlocked(permission==='denied');
   if(permission!=='granted'){setMessage(permission==='denied'?'Notifications are blocked. Allow them in your browser or device settings, then try again.':'Permission was not granted. You can enable notifications whenever you are ready.');return}
   await navigator.serviceWorker.register('/admin-sw.js',{scope:'/',updateViaCache:'none'});
   const registration=await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Device setup timed out. Please try again.')),15000))]);
   subscription=await registration.pushManager.getSubscription();
   if(subscription?.options.applicationServerKey){const current=Array.from(new Uint8Array(subscription.options.applicationServerKey)).join(',');if(current!==Array.from(keyBytes(publicKey)).join(',')){await subscription.unsubscribe();subscription=null}}
   subscription=subscription||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(publicKey)});
   await responseJSON(await fetch('/api/admin/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription.toJSON())}));
   setEnabled(true);setMessage('Enabled on this device. New buyer, seller, consultation and travel requests will trigger an alert.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to enable notifications. Please try again.')}finally{setBusy(false)}
 }
 async function disable(){setBusy(true);setError('');setMessage('');try{
  const subscription=await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
  if(subscription){await responseJSON(await fetch('/api/admin/push',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})}));await subscription.unsubscribe()}
  setEnabled(false);setMessage('Notifications disabled on this device.');
 }catch(e){setError(e instanceof Error?e.message:'Unable to disable notifications.')}finally{setBusy(false)}}
 async function test(){setBusy(true);setError('');setMessage('');try{
  const subscription=await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();if(!subscription)throw Error('Enable notifications on this device first.');
  await responseJSON(await fetch('/api/admin/push/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})}));
  setMessage('Test sent to this device. Check its notification center. Delivery can depend on device settings and Focus mode.');
 }catch(e){setError(e instanceof Error?e.message:'Unable to send a test notification.')}finally{setBusy(false)}}
 return <section className="panel admin-device-notifications" aria-labelledby="device-alerts-title"><div className="device-alerts-copy"><h2 id="device-alerts-title"><svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>New request alerts</h2><p>Receive a device notification when a buyer, seller, lifestyle consultation or travel request arrives. Tap the alert to open the private request.</p><span className={`pill ${enabled?'device-enabled':''}`}>{loading?'Checking this device…':enabled?'Enabled on this device':'Not enabled on this device'}</span></div><div className="device-alerts-actions">{enabled?<><button type="button" className="button dark" disabled={busy||loading||blocked} onClick={test}>{busy?'Please wait…':'Send test notification'}</button><button type="button" className="button outline" disabled={busy||loading} onClick={disable}>Disable on this device</button></>:<button type="button" className="button dark" disabled={busy||loading||!supported||!publicKey||blocked} onClick={enable}>{busy?'Enabling…':blocked?'Notifications blocked':'Enable device notifications'}</button>}</div><div className="device-alerts-help">{homeScreen?<p><strong>iPhone / iPad:</strong> Open this site in Safari, use Share → Add to Home Screen, then open the saved app, sign in to admin and tap Enable device notifications.</p>:!loading&&!supported?<p>This browser does not support device notifications here. Use a supported browser over HTTPS. On iPhone or iPad, add the site to your Home Screen first.</p>:<p>Enable separately on each phone or computer. Alerts can arrive while this page is closed, subject to browser, network and device settings. Email notifications continue as usual.</p>}{blocked&&<p>Allow notifications in your browser or device settings, then return to this page.</p>}{!loading&&!publicKey&&!error&&<p>Device notification setup is unavailable. Please try again later.</p>}{message&&<p role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}</div></section>;
}
