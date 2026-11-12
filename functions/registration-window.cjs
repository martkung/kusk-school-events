function millis(value){return typeof value==='number'?value:value?.toMillis?.()}
function registrationWindow(event,now=Date.now()){
 if(event.registrationMode==='scheduled'){
  const start=millis(event.opensAtMs),end=millis(event.closesAtMs);
  if(event.registrationPaused===true)return {open:false,reason:'paused'};
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return {open:false,reason:'invalid'};
  if(now<start)return {open:false,reason:'waiting'};
  if(now>=end)return {open:false,reason:'closed'};
  return {open:true,reason:'open'};
 }
 const start=millis(event.opensAt),end=millis(event.closesAt);
 return {open:event.registrationOpen===true&&(!Number.isFinite(start)||now>=start)&&(!Number.isFinite(end)||now<end),reason:'manual'};
}
exports.registrationWindow=registrationWindow;
