import {isLineReturn,completeLineReturn} from './line-return.js';
if(isLineReturn(location.href)){
 const main=document.querySelector('#app');
 main.innerHTML='<section class="form"><h2>กำลังกลับจาก LINE</h2><p role="status">กำลังยืนยันการเข้าสู่ระบบ…</p></section>';
 try{
  const {initializeLine}=await import('./line-sdk.js');
  await completeLineReturn({initialize:initializeLine,replace:url=>location.replace(url),href:location.href});
 }catch{
  main.querySelector('[role=status]').textContent='กลับจาก LINE ไม่สำเร็จ กรุณาเปิดหน้าล็อกอินแล้วลองอีกครั้ง';
  const a=document.createElement('a');a.href='./line-pilot.html';a.textContent='เปิดหน้าเข้าสู่ระบบด้วย LINE';main.querySelector('section').append(a);
 }
}else{
 const {mountProductionShell}=await import('./production-shell.js');mountProductionShell();
 try{
  await import('./real-account.js');await import('./live-events.js');await import('./staff.js');await import('./navigation.js');await import('./event-landing.js');
 }catch{
  const main=document.querySelector('#app');main.innerHTML='<section class="pilot-loading"><h2>โหลดหน้าใช้งานไม่สำเร็จ</h2><p>กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองอีกครั้ง</p><button type="button">ลองใหม่</button></section>';main.querySelector('button').onclick=()=>location.reload();
 }
}
