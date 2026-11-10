export function mountProductionShell({win=window,doc=document}={}){
 const main=doc.querySelector('#app'),modal=doc.querySelector('#modal');
 const aliases={'#events':'#live-events','#mine':'#live-mine','#account':'#real-account'};
 function render(){
  const original=win.location.hash||'#home',route=aliases[original]||original;
  if(route!==original||!win.location.hash)win.history.replaceState(null,'',win.location.pathname+win.location.search+route);
  if(modal.open)modal.close();delete modal.dataset.applicationId;
  if(route==='#home'){
   main.innerHTML='<aside class="pilot-announcement" role="note"><strong>เปิดทดลองใช้งานระบบ KUSK Events</strong><p>เลือกกิจกรรม เข้าสู่ระบบด้วย Google หรือ LINE แล้วสมัครได้เลย ใบสมัครและการเช็คอินจะบันทึกในระบบ กิจกรรมที่มีป้าย “สาธิต” ไม่มีการจัดงานจริง</p></aside><section class="home-banner-slot" aria-label="ข่าวประชาสัมพันธ์"></section><div class="quick"><p><b>สมัครไว้แล้ว?</b><br><span>ดูสถานะและเปิดบัตร QR ได้ที่กิจกรรมของฉัน</span></p><a class="pilot-mine-link" href="#live-mine">กิจกรรมของฉัน →</a></div><section id="listing"><p role="status">กำลังโหลดกิจกรรม…</p></section><details class="pilot-help"><summary>วิธีสมัครและเปิดบัตรเข้างาน</summary><ol><li>เลือกกิจกรรมหรือสแกน QR ประจำกิจกรรม แล้วอ่านรายละเอียด</li><li>เข้าสู่ระบบด้วย Google หรือ LINE ใช้บัญชีเดิมทุกครั้ง</li><li>ตรวจชื่อ–นามสกุลและเบอร์โทร แล้วกดยืนยันสมัคร</li><li>ดูผลที่กิจกรรมของฉัน เมื่ออนุมัติแล้วจึงเปิดบัตร QR ให้เจ้าหน้าที่เช็คอิน</li></ol><p>หากเข้าสู่ระบบไม่ได้ ลองเปิดลิงก์ใน Chrome หรือ Safari โดยตรง กรุณาออกจากระบบเมื่อใช้เครื่องร่วมกับผู้อื่น</p></details>';
  }else if(['#live-events','#live-mine','#real-account','#staff','#admin'].includes(route)||/^#event\/[A-Za-z0-9_-]{1,128}$/.test(route)){
   main.innerHTML='<section class="pilot-loading"><p role="status">กำลังเตรียมหน้าใช้งาน…</p></section>';
  }else{
   main.innerHTML='<section class="empty"><h1>ไม่พบหน้าที่ต้องการ</h1><p>ลิงก์อาจไม่ครบหรือเป็นหน้าเดิม กรุณาเลือกกิจกรรมจากหน้าหลัก</p><a href="#home" class="catalog-action">กลับหน้าแรก</a></section>';
  }
 }
 const offline=doc.createElement('div');offline.className='pilot-offline';offline.setAttribute('role','status');offline.textContent='ขณะนี้ไม่มีอินเทอร์เน็ต ข้อมูลอาจไม่ล่าสุด กรุณาเชื่อมต่อก่อนส่งใบสมัครหรือเช็คอิน';doc.querySelector('header').after(offline);
 const connection=()=>{offline.hidden=win.navigator.onLine!==false};connection();win.addEventListener('online',connection);win.addEventListener('offline',connection);
 doc.querySelector('#account').onclick=()=>{win.location.hash='#real-account'};
 doc.querySelector('#modal .close').onclick=()=>modal.close();
 const focus=()=>{main.focus({preventScroll:true})};
 win.addEventListener('hashchange',render);win.addEventListener('hashchange',focus);render();
 return ()=>{win.removeEventListener('hashchange',render);win.removeEventListener('hashchange',focus);win.removeEventListener('online',connection);win.removeEventListener('offline',connection);offline.remove()};
}
