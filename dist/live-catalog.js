import {createEventCard,eventAvailability} from './event-card.js';
import {openEventDetail} from './event-detail.js';
import {rememberEvent,pendingEvent,clearPendingEvent} from './enrollment-intent.js';
export function mountLiveCatalog(root,client,{user=null,home=false,isCurrent=()=>true}={}){
 let events=[],closed=false,pending=false,cached=true;const current=()=>!closed&&isCurrent()&&root.isConnected;
 const searchLabel=document.createElement('label');searchLabel.className='catalog-search';searchLabel.textContent='ค้นหากิจกรรม';const search=document.createElement('input');search.type='search';search.placeholder='พิมพ์ชื่อกิจกรรมหรือสถานที่';search.setAttribute('aria-label','ค้นหากิจกรรม');searchLabel.append(search);
 const status=document.createElement('p');status.className='sub';status.setAttribute('role','status');const grid=document.createElement('div');grid.className='event-card-grid';root.replaceChildren(searchLabel,status,grid);search.oninput=()=>render();
 function render(){if(!current())return;if(root.querySelector('form')||document.querySelector('#modal').open){pending=true;status.textContent='กิจกรรมมีข้อมูลอัปเดต ข้อมูลที่กรอกไว้ยังอยู่ ปิดแบบสมัครหรือหน้าต่างรายละเอียดเพื่อดูข้อมูลล่าสุด';return}pending=false;grid.replaceChildren();status.textContent=cached?'กำลังเชื่อมต่อ · ข้อมูลอาจยังไม่ล่าสุด':'อัปเดตอัตโนมัติ';
  const term=search.value.trim().toLocaleLowerCase('th-TH'),visible=events.filter(event=>[event.name,event.date,event.place].some(value=>String(value||'').toLocaleLowerCase('th-TH').includes(term)));if(term)status.textContent='พบ '+visible.length+' กิจกรรม · '+status.textContent;
  if(!visible.length){const p=document.createElement('p');p.textContent=term?'ไม่พบกิจกรรม ลองเปลี่ยนคำค้นหรือล้างช่องค้นหา':'ยังไม่มีกิจกรรมประกาศเปิดรับ';grid.append(p)}
  visible.forEach((event,index)=>{const {card,actions,openForm}=createEventCard(event,index);grid.append(card);let applyButton;
   const apply=()=>{if(home){rememberEvent(event.id);location.hash=client.auth.currentUser?'#live-events':'#real-account';return}if(!user){rememberEvent(event.id);location.hash='#real-account';return}if(applyButton&&!applyButton.disabled&&!applyButton.hidden)applyButton.click()};
   const details=()=>openEventDetail(event,apply),poster=card.querySelector('.catalog-poster');poster.tabIndex=0;poster.setAttribute('role','button');poster.setAttribute('aria-label','ดูรายละเอียด '+event.name);poster.onclick=details;poster.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details()}};
   const title=card.querySelector('h3'),name=document.createElement('button');name.className='event-title-button';name.textContent=event.name;name.onclick=details;title.replaceChildren(name);card.onclick=e=>{if(!e.target.closest('button,a,input,select,textarea,form,[role=button]'))details()};
   const available=eventAvailability(event);applyButton=document.createElement('button');applyButton.className='primary';applyButton.textContent=available.open?(home||user?'สมัครเข้าร่วม':'เข้าสู่ระบบเพื่อสมัคร'):available.label;applyButton.disabled=!available.open;actions.append(applyButton);
   if(home||!user){applyButton.onclick=apply;return}
   applyButton.onclick=async()=>{applyButton.disabled=true;openForm();const form=document.createElement('form');form.innerHTML='<label>ชื่อ–นามสกุลสำหรับรายชื่อและบัตร<input name="displayName" required maxlength="120" autocomplete="name"></label><label>เบอร์โทรศัพท์<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="0812345678"></label><p class="sub">โรงเรียนใช้เบอร์นี้เพื่อติดต่อเกี่ยวกับกิจกรรม · สมัครให้ตัวเอง</p><button class="primary" type="submit">ยืนยันสมัครเข้าร่วม</button><button type="button">ปิดแบบสมัคร</button><p role="status"></p>';form.onsubmit=e=>e.preventDefault();actions.append(form);applyButton.hidden=true;const buttons=form.querySelectorAll('button'),message=form.querySelector('[role=status]');form.elements.displayName.value=user.displayName||'';
    buttons[1].onclick=()=>{form.remove();card.classList.remove('enrollment-open');applyButton.hidden=false;applyButton.disabled=false;if(pending)render()};
    buttons[0].disabled=true;let typing=false;form.oninput=()=>typing=true;
    try{const profile=await client.loadProfile();if(!current()||!form.isConnected)return;if(!typing){form.elements.displayName.value=profile.displayName||user.displayName||'';form.elements.phone.value=profile.phone||''}}catch{message.textContent='โหลดข้อมูลเดิมไม่ได้ กรุณากรอกชื่อและเบอร์โทร'}
    if(!current()||!form.isConnected)return;buttons[0].disabled=false;form.onsubmit=async e=>{e.preventDefault();if(!current()||!form.isConnected||buttons[0].disabled)return;buttons.forEach(button=>button.disabled=true);try{const latest=events.find(item=>item.id===event.id);if(!latest||!eventAvailability(latest).open)throw new Error('กิจกรรมปิดรับสมัครหรือเต็มแล้ว กรุณาปิดแบบสมัครเพื่อดูข้อมูลล่าสุด');await client.enroll(event.id,form.elements.displayName.value,form.elements.phone.value);if(current())location.hash='#live-mine'}catch(error){if(current())message.textContent=error.message||'ส่งไม่สำเร็จ กรุณาลองใหม่';buttons.forEach(button=>button.disabled=false)}};
   };
   if(pendingEvent()===event.id){clearPendingEvent();if(available.open){applyButton.click();card.scrollIntoView({block:'start'})}else status.textContent='กิจกรรมที่เลือกปิดรับสมัครหรือเต็มแล้ว'}
  });
 }
 const stop=client.watchEvents((data,metadata)=>{events=data;cached=metadata.fromCache;render()},()=>{if(current())status.textContent='เชื่อมต่อกิจกรรมไม่ได้ กรุณาเปลี่ยนหน้าแล้วลองใหม่'});
 const resume=()=>{if(pending)render()};document.querySelector('#modal').addEventListener('close',resume);
 return ()=>{closed=true;stop();document.querySelector('#modal').removeEventListener('close',resume)};
}
