let stopCurrent=()=>{};
export function cameraError(error){return ({NotAllowedError:'ยังไม่ได้อนุญาตกล้อง กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์ หรือวางรหัสบัตรแทน',NotFoundError:'ไม่พบกล้อง กรุณาใช้เครื่องอ่านหรือวางรหัสบัตร',NotReadableError:'กล้องอาจถูกใช้งานอยู่ กรุณาปิดแอปกล้องอื่นแล้วลองใหม่'})[error?.name]||'เปิดกล้องไม่สำเร็จ กรุณาลองใหม่หรือวางรหัสบัตร';}
export function mountCamera(panel,onCode,onStart=()=>{}){
 const tools=document.createElement('div');tools.className='camera-tools';
 const start=document.createElement('button');start.type='button';start.textContent='เปิดกล้องสแกน QR';
 const stop=document.createElement('button');stop.type='button';stop.textContent='หยุดกล้อง';stop.hidden=true;
 const video=document.createElement('video');video.playsInline=true;video.muted=true;video.hidden=true;video.className='scanner-preview';
 const status=document.createElement('p');status.className='sub';status.setAttribute('role','status');tools.append(start,stop,video,status);panel.append(tools);
 let session=0,controls=null,observer=null,locked=false;
 function halt(){session++;try{controls?.stop()}catch{}controls=null;const stream=video.srcObject;stream?.getTracks?.().forEach(track=>track.stop());video.srcObject=null;video.hidden=true;start.disabled=locked;stop.hidden=true;observer?.disconnect();observer=null;window.removeEventListener('hashchange',halt);window.removeEventListener('pagehide',halt);document.removeEventListener('visibilitychange',onVisibility)}
 function onVisibility(){if(document.hidden){halt();status.textContent='หยุดกล้องแล้ว เปิดใหม่เมื่อต้องการสแกน'}}
 stop.onclick=()=>{halt();status.textContent='หยุดกล้องแล้ว'};
 async function begin(){
  if(locked||!panel.isConnected||panel.closest('[hidden]'))return;onStart();
  stopCurrent();stopCurrent=halt;halt();const current=session;start.disabled=true;stop.hidden=false;status.textContent='กำลังขอเปิดกล้อง…';
  window.addEventListener('hashchange',halt);window.addEventListener('pagehide',halt);document.addEventListener('visibilitychange',onVisibility);
  observer=new MutationObserver(()=>{if(!panel.isConnected||panel.closest('[hidden]'))halt()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');
   const {BrowserQRCodeReader}=await import('./vendor/scanner.js');if(current!==session)return;
   video.hidden=false;
   const reader=new BrowserQRCodeReader();
   const resultControls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},video,(result,error,scanControls)=>{
    if(!result||current!==session)return;
    scanControls.stop();halt();try{onCode(result.getText());status.textContent='อ่านบัตรแล้ว กรุณาตรวจชื่อและสถานะด้านล่าง'}catch(error){status.textContent=error.message||'ไม่ใช่บัตรของระบบ'}
   });
   if(current!==session){resultControls.stop();return}controls=resultControls;status.textContent='เล็ง QR ให้อยู่ในภาพ กล้องจะหยุดเมื่ออ่านได้';
  }catch(error){if(current===session){halt();status.textContent=cameraError(error)}}
 };
 start.onclick=begin;return {stop:halt,start:begin,setDisabled(value){locked=value;start.disabled=value||!!controls;if(value)halt()}};
}
