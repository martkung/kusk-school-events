// Small UX layer kept separate from the initial catalog prototype.
let myFilter='ทั้งหมด';
const baseRender=render;
render=function(){
 baseRender();
 const route=location.hash.slice(1).split('/')[0]||'home';
 document.querySelectorAll('nav a').forEach(a=>{
  const active=a.getAttribute('href')==='#'+route;
  if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 });
 if(route==='apply'){
  const select=document.querySelector('#person');
  if(select){try{const remembered=localStorage.getItem('kusk-demo-participant');if(remembered&&Array.from(select.options).some(o=>o.value===remembered))select.value=remembered}catch{}
  select.addEventListener('change',()=>{try{localStorage.setItem('kusk-demo-participant',select.value)}catch{}})}
 }
 if(route!=='mine'||!state.signedIn||!state.registrations.length)return;
 const registrations=state.registrations;
 const active=registrations.filter(r=>r.status!=='cancelled').length;
 const summary=document.createElement('div');summary.className='my-summary';
 summary.innerHTML=`<div><strong>${active}</strong><span>บัตรพร้อมเปิด</span></div><div><strong>${registrations.length}</strong><span>รายการสมัครทั้งหมด</span></div><div><strong>${registrations.length-active}</strong><span>รายการยกเลิก</span></div>`;
 document.querySelector('.section-head').after(summary);
 const filters=document.createElement('div');filters.className='filters';filters.setAttribute('aria-label','กรองรายการสมัคร');
 ['ทั้งหมด','บัตรพร้อมเปิด','ยกเลิกแล้ว'].forEach(label=>{const b=document.createElement('button');b.textContent=label;b.classList.toggle('active',myFilter===label);b.setAttribute('aria-pressed',myFilter===label);b.onclick=()=>{myFilter=label;render()};filters.append(b)});summary.after(filters);
 let visible=0;
 document.querySelectorAll('[data-ticket]').forEach(button=>{
  const r=registrations.find(x=>x.id===button.dataset.ticket);if(!r)return;
  const card=button.closest('article');const cancelled=r.status==='cancelled';
  const showCard=myFilter==='ทั้งหมด'||(myFilter==='ยกเลิกแล้ว'?cancelled:!cancelled);card.hidden=!showCard;if(showCard)visible++;
  if(cancelled){card.querySelector('.badge').textContent='ยกเลิกแล้ว · ตัวอย่าง';card.classList.add('cancelled');button.remove();return}
  const actions=document.createElement('div');actions.className='ticket-actions';button.replaceWith(actions);actions.append(button);
  const cancel=document.createElement('button');cancel.className='text-button';cancel.textContent='ยกเลิกการสมัคร';actions.append(cancel);
  cancel.onclick=()=>{const event=events.find(e=>e.id===r.eventId);show(`<h2>ยกเลิกการสมัครตัวอย่าง?</h2><p>${escape(event.name)}<br>${escape(r.person)}</p><p>รายการจะยังอยู่ในประวัติ คุณสามารถเปลี่ยนใจในหน้าต่างนี้ได้</p><button id="keepRegistration" class="primary">เก็บการสมัครไว้</button><button id="cancelRegistration" class="text-button">ยืนยันยกเลิก</button>`);document.querySelector('#keepRegistration').onclick=()=>modal.close();document.querySelector('#cancelRegistration').onclick=()=>{r.status='cancelled';save();modal.close();render();notify('ยกเลิกรายการตัวอย่างแล้ว')}};
 });
 if(!visible){const empty=document.createElement('p');empty.className='empty';empty.textContent='ยังไม่มีรายการในหมวดนี้';filters.after(empty)}
};
// Cancelled records remain history; only active entries should block a new application.
window.addEventListener('hashchange',()=>{const route=location.hash.slice(1).split('/')[0];if(route!=='home')document.querySelector('#app').focus({preventScroll:true})});
render();
