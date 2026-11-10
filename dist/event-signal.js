export function watchEventSignal({sdk,db,auth},eventId,onData,onError){
 const uid=auth.currentUser?.uid;if(!uid)throw new Error('กรุณาเข้าสู่ระบบ');if(!/^[\w-]{1,128}$/.test(eventId))throw new Error('กิจกรรมไม่ถูกต้อง');let closed=false;
 const stop=sdk.onSnapshot(sdk.doc(db,'schoolEventSignals',eventId),{includeMetadataChanges:true},snapshot=>{if(!closed&&auth.currentUser?.uid===uid)onData({fromCache:snapshot.metadata.fromCache})},error=>{if(!closed&&auth.currentUser?.uid===uid)onError?.(error)});
 return ()=>{closed=true;stop()};
}
export function createRefreshQueue({refresh,isCurrent,blocked,onError=()=>{},delay=600,setTimer=setTimeout,clearTimer=clearTimeout}){
 let disposed=false,pending=false,running=false,timer,failures=0;
 function schedule(wait=delay){if(disposed||!isCurrent()||timer!==undefined||running)return;timer=setTimer(()=>{timer=undefined;flush()},wait)}
 async function flush(){if(disposed||!isCurrent()||running||!pending||blocked())return;pending=false;running=true;try{await refresh();failures=0}catch(error){if(!disposed&&isCurrent()){failures++;pending=true;try{onError(error)}catch{}}}finally{running=false;if(pending)schedule(failures?Math.min(30000,1000*2**Math.min(failures-1,5)):delay)}}
 return {request(){if(disposed)return;pending=true;schedule()},flush,dispose(){disposed=true;pending=false;if(timer!==undefined)clearTimer(timer);timer=undefined}};
}
