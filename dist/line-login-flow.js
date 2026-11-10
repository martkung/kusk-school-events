import {LINE_LIFF_ID} from './line-sdk.js';
import {validEventId} from './event-link.js';
import {rememberEvent,pendingEvent} from './enrollment-intent.js';
import {rememberMyActivities,loginReturn,consumeLoginReturn} from './login-return.js';
import {currentLineCredential} from './line-session.js';
const emptyStorage={getItem:()=>null,setItem(){},removeItem(){}};
function browserStorage(){try{return globalThis.sessionStorage||emptyStorage}catch{return emptyStorage}}
// Only public navigation hints cross browsers. Never include identity or tokens.
export function lineEntryURL({eventId=null,returnTo=null,manage=false}={}){
 const url=new URL('https://liff.line.me/'+LINE_LIFF_ID+'/line-pilot.html');
 if(validEventId(eventId))url.searchParams.set('event',eventId);
 if(returnTo==='#live-mine')url.searchParams.set('returnTo','mine');
 if(manage)url.searchParams.set('mode','manage');
 return url.href;
}
export function lineHints(href){
 const url=new URL(href);let source=url;
 const state=url.searchParams.get('liff.state');
 if(state&&state.startsWith('/')&&!state.startsWith('//')){try{source=new URL(state,url.origin)}catch{}}
 return {eventId:validEventId(source.searchParams.get('event'))?source.searchParams.get('event'):null,returnTo:source.searchParams.get('returnTo')==='mine'?'#live-mine':null,manage:source.searchParams.get('mode')==='manage'};
}
export function restoreLineHints(href,storage=browserStorage()){const hints=lineHints(href);if(hints.eventId)rememberEvent(hints.eventId,storage);if(hints.returnTo)rememberMyActivities(storage);return hints}
export function localLineEndpoint(href){const hints=lineHints(href),url=new URL('/line-pilot.html',href);if(hints.eventId)url.searchParams.set('event',hints.eventId);if(hints.returnTo)url.searchParams.set('returnTo','mine');if(hints.manage)url.searchParams.set('mode','manage');return url.href}
export function authorizeOnce(liff,redirectUri,storage=browserStorage(),now=Date.now){
 const key='kusk-line-auto-start',stamp=now();let previous;
 try{previous=Number(storage.getItem(key));if(previous>0&&stamp-previous<120000)return false;storage.setItem(key,String(stamp));if(storage.getItem(key)!==String(stamp))return false}catch{return false}
 liff.login({redirectUri});return true;
}
export function createLineCompletion({client,liff,replace=url=>location.replace(url),storage=browserStorage()}){
 let task=null,finished=false;
 return ()=>{
  if(finished)return Promise.resolve();if(task)return task;
  task=(async()=>{
   const result=await client.linePilot({action:'login',idToken:currentLineCredential(liff)});
   await client.signInLine(result.customToken);
   // Keep the selected activity ahead of role-based default landing pages.
   const profile=await client.loadProfile();let target;
   if(!profile.displayName||!profile.phone)target='#real-account';
   else if(pendingEvent(storage))target='#live-events';
   else if(loginReturn(storage))target=consumeLoginReturn(storage);
   else {const context=await client.staffContext();target=context.admin?'#admin':context.events?.length?'#staff':'#live-mine'}
   try{storage.removeItem('kusk-line-auto-start')}catch{}
   if(target==='#live-events')consumeLoginReturn(storage);
   finished=true;replace('./'+target);
  })().finally(()=>{task=null});return task;
 };
}
