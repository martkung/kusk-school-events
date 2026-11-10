// Real authentication is gated until shared-project rules and legacy roles pass audit.
import {connectFirebase} from './firebase-client.js';
import {mobileBrowser,mountMobileGoogle} from './google-mobile.js';
import {pendingEvent} from './enrollment-intent.js';
import {mountLineSignIn} from './line-signin-link.js';
import {consumeLoginReturn} from './login-return.js';
export async function mountRealAccount({button, container, securityReady=false, onAccount=()=>{},returnTo=null}) {
  if(!securityReady){
    button.disabled=true;
    button.textContent='บัญชีจริงกำลังเตรียมพร้อม';
    container.textContent='ระบบบัญชียังไม่พร้อมให้บริการ กรุณาติดต่อเจ้าหน้าที่';
    return ()=>{};
  }
  let client;
  try{client=await connectFirebase()}catch{
    container.textContent='เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่';return ()=>{};
  }
  let busy=false,disposed=false,googleCleanup=()=>{};
  const mobile=mobileBrowser(navigator);
  const googleHost=document.createElement('div');googleHost.className='google-mobile-signin';button.after(googleHost);
  const lineHost=document.createElement('div');googleHost.after(lineHost);const stopLine=mountLineSignIn(lineHost,client,{returnTo});
  const routeAfterLogin=async()=>{const stored=consumeLoginReturn(),requested=returnTo==='#live-mine'?'#live-mine':stored;if(requested){if(!disposed)location.hash=requested;return}if(pendingEvent()){if(!disposed)location.hash='#live-events';return}const context=await client.staffContext();if(!disposed)location.hash=context.admin?'#admin':context.events.length?'#staff':'#live-mine'};
  button.disabled=true;
  const click=async()=>{
    if(busy)return;busy=true;button.disabled=true;
    try{
      if(client.auth.currentUser)await client.signOut();else await client.signInGoogle();
      if(client.auth.currentUser)await routeAfterLogin();
    }catch(error){
      const messages={
        'auth/popup-closed-by-user':'ยังไม่ได้เข้าสู่ระบบ กดเพื่อลองใหม่ได้',
        'auth/popup-blocked':'เบราว์เซอร์ปิดกั้นหน้าต่างเข้าสู่ระบบ กรุณาอนุญาตแล้วลองใหม่',
        'auth/unauthorized-domain':'โดเมนนี้ยังไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแล',
        'auth/network-request-failed':'การเชื่อมต่อขัดข้อง กรุณาลองใหม่'
      };
      container.textContent=messages[error.code]||'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
    }finally{busy=false;button.disabled=false}
  };
  button.addEventListener('click',click);
  const stop=client.observeAccount(user=>{
    button.disabled=busy;
    // Display only; never turn local demo registrations into owned live records.
    button.textContent=user?'ออกจากระบบ':'เข้าสู่ระบบด้วย Google';
    button.classList.toggle('google-login',!user);
    button.hidden=mobile&&!user;
    googleHost.hidden=!mobile||!!user;
    container.textContent=user?`เข้าสู่ระบบแล้ว: ${user.displayName||'ผู้สมัคร'}`:'เข้าสู่ระบบเพื่อเก็บประวัติและบัตรของคุณ';
    onAccount(user,client);
  });
  if(mobile){
    container.textContent='ใช้ปุ่ม Google ด้านล่างเพื่อเข้าสู่ระบบบนมือถือ';
    googleHost.textContent='กำลังโหลดปุ่ม Google…';
    mountMobileGoogle({host:googleHost,client,onSuccess:routeAfterLogin,onError:error=>{container.textContent=error.message||'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'}}).then(cleanup=>{if(disposed)cleanup();else googleCleanup=cleanup}).catch(error=>{if(!disposed){googleHost.textContent='';button.hidden=false;container.textContent=error.message+' หรือกดปุ่มเข้าสู่ระบบเพื่อลองวิธีเดิม'}});
  }
  return ()=>{disposed=true;stop();stopLine();lineHost.remove();googleCleanup();googleHost.remove();button.removeEventListener('click',click)};
}
