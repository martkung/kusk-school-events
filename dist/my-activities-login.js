import {mountRealAccount} from './account-auth.js';
export function mountMyActivitiesLogin(root,{mount=mountRealAccount}={}){
 root.innerHTML='<section class="auth-page"><h3>เข้าสู่ระบบเพื่อดูกิจกรรมของคุณ</h3><p class="sub">ดูสถานะการสมัคร ประวัติการเข้าร่วม และเปิดบัตร QR ได้ในที่เดียว</p><div class="auth-announcement" role="note"><strong>ใช้บัญชีเดียวกับที่สมัครกิจกรรม</strong>เลือก Google หรือ LINE ที่คุณใช้สมัครไว้ เพื่อดูรายการและบัตรของคุณได้ครบ</div><div class="panel"><button class="primary" data-login-google>กำลังเตรียมช่องทางเข้าสู่ระบบ…</button><p data-login-status role="status" aria-live="polite"></p></div><a class="auth-back" href="#live-events">← ดูกิจกรรมทั้งหมด</a></section>';
 let disposed=false,stop=()=>{};
 mount({button:root.querySelector('[data-login-google]'),container:root.querySelector('[data-login-status]'),securityReady:true,returnTo:'#live-mine'}).then(cleanup=>{if(disposed)cleanup();else stop=cleanup}).catch(()=>{if(!disposed){const status=root.querySelector('[data-login-status]');if(status)status.textContent='เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่'}});
 return ()=>{disposed=true;stop()};
}
