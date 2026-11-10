import {mountPosterPicker} from './poster-picker.js';
import {saveEventDetails} from './event-save.js';
export function eventPayload(form){
 const event=Object.fromEntries(['name','date','place','description'].map(k=>[k,form.elements[k].value.trim()]));
 event.capacity=Number(form.elements.capacity.value);
 if(Object.values(event).some(v=>typeof v==='string'&&!v)||!Number.isInteger(event.capacity)||event.capacity<1||event.capacity>100000)throw new Error('กรุณากรอกข้อมูลให้ครบ และระบุจำนวนรับ 1–100,000 คน');
 return event;
}
export function mountEventForm(root,client,onCreated){
 const details=document.createElement('details');details.className='panel';details.innerHTML='<summary>＋ สร้างกิจกรรมใหม่</summary><form><label>ชื่อกิจกรรม<input name="name" required maxlength="2000"></label><label>วันและเวลา<input name="date" required maxlength="2000" placeholder="เช่น 20 มกราคม 2570 เวลา 09:00–15:00 น."></label><label>สถานที่<input name="place" required maxlength="2000"></label><label>รายละเอียด<textarea name="description" required maxlength="2000" rows="4"></textarea></label><label>จำนวนรับ (คน)<input type="number" name="capacity" min="1" max="100000" step="1" required></label><p class="sub">บันทึกแล้วข้อมูลกิจกรรมจะปรากฏบนเว็บ โดยยังปิดรับสมัครและเช็คอิน คุณเปิดรับภายหลังได้</p><button class="primary" type="submit">บันทึกกิจกรรม</button><p role="status"></p></form>';root.append(details);
 const form=details.querySelector('form'),status=form.querySelector('[role=status]'),button=form.querySelector('button');
 const imageArea=document.createElement('div');button.before(imageArea);const poster=mountPosterPicker(imageArea);
 // Keep one ID for retries if the response is lost after the server commits.
 const eventId='event-'+crypto.randomUUID();let finished=false,busy=false;const state={created:false};
 form.onsubmit=async e=>{e.preventDefault();if(finished||busy||!form.isConnected)return;busy=true;button.disabled=true;poster.setDisabled(true);status.textContent='กำลังบันทึก…';try{const event=eventPayload(form);await saveEventDetails(client,eventId,event,state);if(!form.isConnected)return;await poster.upload(client,eventId);finished=true;if(!form.isConnected)return;status.textContent='บันทึกแล้ว กิจกรรมยังปิดรับสมัคร';await onCreated(eventId)}catch(error){status.textContent=(state.created?'กิจกรรมสร้างแล้ว แต่ขั้นตอนบันทึกยังไม่ครบ: ':'')+(error.message||'บันทึกไม่สำเร็จ')+' กดลองใหม่ได้';button.disabled=false}finally{busy=false;poster.setDisabled(false)}};
 return details;
}
