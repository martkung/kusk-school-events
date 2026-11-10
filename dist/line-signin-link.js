import {lineEntryURL} from './line-login-flow.js';
import {pendingEvent} from './enrollment-intent.js';
export function mountLineSignIn(host,client,{returnTo=null}={}){
 let disposed=false,version=0;
 const stop=client.observeAccount(async user=>{
  const current=++version;host.replaceChildren();if(user)return;
  try{
   const state=await client.linePilot({action:'status'});
   if(disposed||current!==version||client.auth.currentUser||!state.enabled)return;
   const a=document.createElement('a');a.href=lineEntryURL({eventId:pendingEvent(),returnTo});a.className='primary line-login';a.textContent='เข้าสู่ระบบด้วย LINE';

   const note=document.createElement('p');note.className='sub';note.textContent=state.directLogin?'ใช้บัญชี LINE ของคุณ · ครั้งแรกกรอกชื่อและเบอร์โทร':'สำหรับบัญชี LINE ที่ได้รับสิทธิ์เข้าใช้งาน';host.append(a,note);
  }catch{
   if(!disposed&&current===version){const note=document.createElement('p');note.className='sub';note.textContent='โหลดช่องทาง LINE ไม่ได้ กรุณาลองใหม่ภายหลัง';host.append(note)}
  }
 });
 return ()=>{disposed=true;version++;stop();host.replaceChildren()};
}
