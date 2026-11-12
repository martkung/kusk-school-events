export function registrationWindow(event,now=Date.now()){
 if(event.registrationMode==='scheduled'){
  const start=event.opensAtMs,end=event.closesAtMs;
  if(event.registrationPaused===true)return {open:false,reason:'paused'};
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return {open:false,reason:'invalid'};
  if(now<start)return {open:false,reason:'waiting'};
  if(now>=end)return {open:false,reason:'closed'};
  return {open:true,reason:'open'};
 }
 const start=event.opensAt?.toMillis?.(),end=event.closesAt?.toMillis?.();
 return {open:event.registrationOpen===true&&(!Number.isFinite(start)||now>=start)&&(!Number.isFinite(end)||now<end),reason:'manual'};
}
export function thaiTime(ms){return Number.isFinite(ms)?new Date(ms).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'})+' น.':'ยังไม่กำหนด'}
export function timedCatalog(onData,{clock=globalThis,now=Date.now}={}){
 let items=null,metadata,key='',closed=false;
 const state=()=>JSON.stringify(items?.map(event=>[event.id,registrationWindow(event,now()).open,registrationWindow(event,now()).reason]));
 const tick=()=>{if(!closed&&items){const next=state();if(next!==key){key=next;onData(items,metadata)}}};
 const timer=clock.setInterval(tick,1000);
 return {receive(data,meta){if(closed)return;items=data;metadata=meta;key=state();onData(items,metadata)},dispose(){closed=true;clock.clearInterval(timer)}};
}
