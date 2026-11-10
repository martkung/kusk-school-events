import {restoreLineHints,lineEntryURL,localLineEndpoint,authorizeOnce,createLineCompletion} from './line-login-flow.js';
import {connectFirebase} from './firebase-client.js';
import {initializeLine} from './line-sdk.js';
import {pendingEvent} from './enrollment-intent.js';
import {loginReturn} from './login-return.js';
import {currentLineCredential,lineReauthenticationRequired,renewLineSession} from './line-session.js';
const hints=restoreLineHints(location.href),manage=hints.manage;
const status=document.querySelector('#status'),actions=document.querySelector('#actions');
const endpoint=localLineEndpoint(location.href);
let busy=false,recoverSession=null;
function button(label,action,host=actions){const el=document.createElement('button');el.className=host===actions?'primary line-login':'secondary';el.textContent=label;el.onclick=async()=>{if(busy)return;busy=true;actions.querySelectorAll('button').forEach(b=>b.disabled=true);try{await action()}catch(error){if(recoverSession&&lineReauthenticationRequired(error))recoverSession();else status.textContent=error?.message||'ทำรายการไม่สำเร็จ กรุณาลองใหม่'}finally{busy=false;actions.querySelectorAll('button').forEach(b=>b.disabled=false)}};host.append(el)}
function googleLink(){const a=document.createElement('a');a.href='./#real-account';a.className='auth-back';a.textContent='ใช้ Google แทน / กลับหน้าเข้าสู่ระบบ';actions.append(a)}
function appLink(){const a=document.createElement('a');a.className='primary line-login';a.href=lineEntryURL({eventId:pendingEvent(),returnTo:loginReturn(),manage});a.textContent='เปิดด้วยแอป LINE';actions.append(a)}
async function start(){
 const client=await connectFirebase();await new Promise(resolve=>{let off=()=>{};off=client.observeAccount(()=>{queueMicrotask(()=>{off();resolve()})})});
 const state=await client.linePilot({action:'status'});
 if(!state.enabled){status.textContent='LINE ไม่พร้อมให้บริการในขณะนี้ กรุณาเข้าสู่ระบบด้วย Google';googleLink();return}
 const liff=await initializeLine(state.liffId),complete=createLineCompletion({client,liff});
 recoverSession=()=>{status.textContent='LINE ยังยืนยันตัวตนไม่ได้ ลองเปิดด้วยแอป LINE หรือเข้าสู่ระบบใหม่';actions.replaceChildren();appLink();button('ลองยืนยัน LINE ใหม่',()=>renewLineSession(liff,endpoint));googleLink()};
 if(!liff.isLoggedIn()){
  status.textContent='กำลังเปิด LINE… หากหน้าไม่เปลี่ยน แตะ “เปิดด้วยแอป LINE” หรือเลือก Google แทนได้';appLink();button('ลองเข้าสู่ระบบ LINE อีกครั้ง',()=>renewLineSession(liff,endpoint));googleLink();if(!manage&&!liff.isInClient())authorizeOnce(liff,endpoint);return;
 }
 const token=()=>currentLineCredential(liff);
 try{token()}catch(error){if(lineReauthenticationRequired(error)){recoverSession();return}throw error}
 if(!manage){
  status.textContent='กำลังยืนยันกับ LINE และพากลับไปกิจกรรม…';
  try{await complete()}catch(error){if(lineReauthenticationRequired(error)){recoverSession();return}status.textContent=error?.message||'เชื่อมต่อไม่สำเร็จ ลองอีกครั้งได้';button('ลองอีกครั้ง',complete);googleLink()}return;
 }
 status.textContent='จัดการการเชื่อมบัญชีเดิมกับ LINE';button('เข้าใช้งานด้วย LINE',complete);
 const management=document.createElement('details'),summary=document.createElement('summary');summary.textContent='เชื่อมบัญชีเดิมและจัดการสิทธิ์';management.append(summary);actions.append(management);
 if(!state.linked)button('ยืนยันบัญชีเดิมด้วย Google',async()=>{
  await client.signInGoogle();await client.linePilot({action:'link',idToken:token()});
  status.textContent='ยืนยันบัญชีเดิมและเชื่อม LINE แล้ว กดเข้าสู่ระบบด้วย LINE เพื่อใช้งานตามสิทธิ์';
  actions.replaceChildren();button('เข้าสู่ระบบด้วย LINE',()=>location.replace(endpoint));
 },management);
 if(state.google&&state.eligible){
  if(!state.linked&&state.fresh)button('เชื่อม LINE กับบัญชี Google ที่เข้าใช้อยู่',async()=>{await client.linePilot({action:'link',idToken:token()});status.textContent='เชื่อมบัญชีเดิมแล้ว กดเข้าสู่ระบบด้วย LINE ได้เลย';actions.replaceChildren();button('เข้าสู่ระบบด้วย LINE',()=>location.replace(endpoint))},management);
  if(state.linked&&state.fresh)button('ยกเลิกการเชื่อม LINE กับบัญชีเดิม',async()=>{if(!confirm('ยกเลิกการเชื่อม LINE? บัญชี Google และบัตรเดิมยังอยู่'))return;await client.linePilot({action:'unlink'});location.replace(endpoint)},management);
 }
 googleLink();
}
start().catch(error=>{status.textContent=error?.message||'เชื่อมต่อไม่ได้ กรุณาลองใหม่';googleLink()});
