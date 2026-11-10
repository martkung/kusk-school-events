import {drawQrImage} from './qr-image.js';
import {mountSignaturePad,viewSignature} from './signature-pad.js';
import {passCode,parsePass} from './pass-code.js';
import {mountCamera} from './camera-scanner.js';
import {createCheckinController} from './checkin-controller.js';
import {currentApplication} from './catalog-state.js';
export async function showPass(record){
 const modal=document.querySelector('#modal'),body=document.querySelector('#modalBody');body.replaceChildren();
 modal.dataset.applicationId=record.id;
 const title=document.createElement('h2');title.dataset.passTitle='true';title.textContent=record.eventName;
 const person=document.createElement('p');person.dataset.passPerson='true';person.textContent=record.participantName+' · '+(record.eventDate||'')+(record.eventPlace?' · '+record.eventPlace:'');
 const schedule=document.createElement('p');schedule.dataset.passSchedule='true';schedule.className='sub';schedule.textContent=record.eventDateAtRegistration&&record.eventDateAtRegistration!==record.eventDate?'กำหนดการปรับปรุงแล้ว กรุณายึดวันจัดล่าสุดด้านบน':'';
 const status=document.createElement('p');status.textContent=record.checkedIn?'เช็คอินแล้ว':'อนุมัติแล้ว · แสดง QR ให้เจ้าหน้าที่';
 status.dataset.passStatus='true';
 const canvas=document.createElement('canvas');canvas.style.maxWidth='100%';canvas.setAttribute('aria-label','QR บัตรเข้าร่วมกิจกรรม');
 const code=document.createElement('code');code.style.overflowWrap='anywhere';
 body.append(title,person,schedule,status,canvas,code);modal.showModal();
 try{const text=passCode(record);code.textContent='เลขอ้างอิง '+(record.referenceCode||record.id);const QR=await import('./vendor/qr.js');await drawQrImage(canvas,text,QR.default);
 if(!modal.open||!canvas.isConnected||modal.dataset.applicationId!==record.id)return;
 const save=document.createElement('a');save.className='catalog-action';save.textContent='บันทึก QR ลงเครื่อง';save.download='kusk-pass-'+(record.referenceCode||record.id.slice(0,8))+'.png';save.href=canvas.toDataURL('image/png');body.append(save);
 const hint=document.createElement('p');hint.className='sub';hint.textContent='สถานะในระบบ ณ เวลาเช็คอินเป็นข้อมูลยืนยัน บัตรที่ยกเลิกแล้วใช้เข้างานไม่ได้';body.append(hint);
 }catch(error){status.textContent=error.message||'สร้าง QR ไม่สำเร็จ กรุณาแสดงเลขอ้างอิงให้เจ้าหน้าที่';canvas.hidden=true}
}
export function updateOpenPass(applications,catalog=[]){
 const modal=document.querySelector('#modal');if(!modal.open||!modal.dataset.applicationId)return;
 const status=modal.querySelector('[data-pass-status]');if(!status)return;
 const record=applications.find(item=>item.id===modal.dataset.applicationId);
 if(!record||record.status!=='approved'||!catalog.some(event=>event.id===record.eventId&&event.deleted!==true&&event.published!==false)){modal.close();delete modal.dataset.applicationId;return}
 const latest=currentApplication(record,catalog.find(event=>event.id===record.eventId)),title=modal.querySelector('[data-pass-title]'),person=modal.querySelector('[data-pass-person]'),schedule=modal.querySelector('[data-pass-schedule]');
 if(title)title.textContent=latest.eventName;if(person)person.textContent=latest.participantName+' · '+(latest.eventDate||'')+(latest.eventPlace?' · '+latest.eventPlace:'');if(schedule)schedule.textContent=latest.eventDateAtRegistration&&latest.eventDateAtRegistration!==latest.eventDate?'กำหนดการปรับปรุงแล้ว กรุณายึดวันจัดล่าสุดด้านบน':'';
 status.textContent=record.checkedIn?'เช็คอินแล้ว':'อนุมัติแล้ว · แสดง QR ให้เจ้าหน้าที่';
}
export function mountPassCheckin(root,client,eventId,afterCheckin,isActive=()=>true){
 const panel=document.createElement('div');panel.className='panel checkin-panel';panel.innerHTML='<h3>ตรวจบัตรเข้างาน</h3><p class="sub">สแกนบัตร → ตรวจชื่อและสถานะ → ยืนยันเช็คอิน</p><form><label>วางรหัสบัตร หรือใช้เครื่องอ่าน QR<input name="code" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="KUSKevent-7M4X9P2A หรือสแกน QR"></label><button type="submit">ตรวจบัตร</button></form>';root.append(panel);
 const form=panel.querySelector('form'),lookup=form.querySelector('button'),input=form.elements.code;
 const result=document.createElement('div');result.className='checkin-result';result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 const confirm=document.createElement('button');confirm.type='button';confirm.className='primary checkin-confirm';confirm.textContent='ยืนยันเช็คอิน';confirm.hidden=true;
 const next=document.createElement('button');next.type='button';next.className='checkin-next';next.textContent='สแกนคนถัดไป';next.hidden=true;
 const signatureOption=document.createElement('label');signatureOption.className='signature-option';const collect=document.createElement('input');collect.type='checkbox';signatureOption.append(collect,document.createTextNode(' เก็บลายเซ็นผู้เข้าร่วม (สำหรับหลักฐานการเข้าร่วม / เบิกจ่าย)'));const signatureArea=document.createElement('div');let pad=null,padId=null,lastState=null;
 function checkConfirm(){if(!lastState)return;const eligible=lastState.phase==='ready'&&lastState.record?.status==='approved'&&lastState.record.checkinOpen&&(!lastState.record.checkedIn||collect.checked&&!lastState.record.hasSignature);confirm.hidden=!eligible;confirm.disabled=lastState.phase==='submitting'||collect.checked&&(!pad?.valid||lastState.record?.hasSignature===true);confirm.textContent=collect.checked?(lastState.record?.checkedIn?'บันทึกลายเซ็น':'บันทึกลายเซ็นและเช็คอิน'):'ยืนยันเช็คอิน'}
 function drawSignature(state){lastState=state;const eligible=['ready','submitting'].includes(state.phase)&&state.record?.status==='approved'&&state.record.checkinOpen&&!state.record.hasSignature;signatureOption.hidden=!eligible;collect.disabled=state.phase==='submitting';signatureArea.hidden=!collect.checked||!eligible;if(!eligible||!collect.checked){pad?.dispose();pad=null;padId=null}else if(padId!==state.id){pad?.dispose();padId=state.id;pad=mountSignaturePad(signatureArea,state.record.participantName,()=>checkConfirm())}pad?.setDisabled(state.phase==='submitting');checkConfirm()}
 collect.onchange=()=>{if(lastState)drawSignature(lastState)};
 let camera;const active=()=>isActive()&&panel.isConnected;
 const controller=createCheckinController(client,eventId,state=>{
  lastState=state;const busy=state.phase==='submitting';input.disabled=busy;lookup.disabled=busy||state.phase==='loading';camera?.setDisabled(busy);confirm.disabled=busy;confirm.hidden=true;next.hidden=!['ready','done','error'].includes(state.phase);next.disabled=busy;result.replaceChildren();result.dataset.state=state.phase;
  const p=document.createElement('p');
  if(state.record){const title=document.createElement('h3');title.textContent=state.record.participantName;result.append(title);p.textContent=({pending:'รอพิจารณา ยังเช็คอินไม่ได้',approved:'อนุมัติแล้ว',rejected:'ไม่ผ่านการพิจารณา',cancelled:'ใบสมัครยกเลิกแล้ว'})[state.record.status]||'ใบสมัครนี้เช็คอินไม่ได้';if(state.record.hasSignature){const signed=document.createElement('button');signed.type='button';signed.textContent='ดูลายเซ็นที่บันทึกแล้ว';signed.disabled=busy;signed.onclick=()=>viewSignature(client,eventId,state.id,active);result.append(signed)}if(state.record.checkedIn)p.textContent+=' · เช็คอินแล้ว';else if(!state.record.checkinOpen)p.textContent+=' · กิจกรรมยังไม่เปิดเช็คอิน';confirm.hidden=state.phase!=='ready'||state.record.status!=='approved'||state.record.checkedIn||!state.record.checkinOpen;}
  if(state.phase==='idle')p.textContent='เปิดกล้องเพื่อสแกน หรือวางรหัสแล้วกดตรวจบัตร';
  if(state.phase==='loading')p.textContent='กำลังตรวจบัตรกับระบบ…';
  if(state.phase==='submitting')p.textContent='กำลังบันทึกเช็คอิน กรุณารอ…';
  if(state.phase==='error')p.textContent=state.message;
  if(state.phase==='done'){p.textContent=state.signatureSaved?'บันทึกลายเซ็นแล้ว · เช็คอินแล้ว':state.alreadyDone?'บัตรนี้เช็คอินแล้ว ไม่บันทึกซ้ำ':'เช็คอินสำเร็จ';if(!state.alreadyDone){try{navigator.vibrate?.(100)}catch{}}}
  if(state.message&&state.phase==='ready')p.textContent+=' · '+state.message;result.append(p);drawSignature(state);
 },active,id=>afterCheckin?.(id));
 camera=mountCamera(panel,text=>{input.value=text;input.blur();controller.preview(text)},()=>{input.value='';controller.reset()});panel.append(result,signatureOption,signatureArea,confirm,next);
 input.oninput=()=>controller.reset();
 form.onsubmit=event=>{event.preventDefault();camera.stop();input.blur();controller.preview(input.value)};
 confirm.onclick=()=>{if(collect.checked){try{controller.confirm(pad.value())}catch(error){result.textContent=error.message}}else controller.confirm()};
 next.onclick=()=>{input.value='';input.blur();controller.reset();camera.start()};
 controller.reset();return panel;
}
