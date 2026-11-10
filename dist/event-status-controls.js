export function mountEventStatus(root,client,event,isCurrent=()=>true){
 let state={...event},busy=false,confirming=false,disposed=false,stale=false,confirmation=null;
 const revisions={registrationOpen:0,checkinOpen:0};
 const panel=document.createElement('section');panel.className='panel event-status-controls';
 const heading=document.createElement('h3');heading.textContent='สถานะกิจกรรม';
 const summary=document.createElement('p');summary.className='event-live-state';summary.dataset.eventId=event.id;
 const message=document.createElement('p');message.className='event-status-message';message.setAttribute('role','status');
 panel.append(heading,summary);root.append(panel);
 const active=()=>!disposed&&isCurrent()&&panel.isConnected;
 const groups=[['registrationOpen','การรับสมัคร','เปิดรับสมัคร','พักรับสมัคร','pauseRegistration'],['checkinOpen','การเช็คอิน','เปิดเช็คอิน','พักเช็คอิน','pauseCheckin']];
 const buttons=[];
 function draw(){
  if(!active())return;panel.setAttribute('aria-busy',String(busy));
  summary.textContent='รับสมัคร: '+(state.registrationOpen?'เปิด':'ปิด')+' · เช็คอิน: '+(state.checkinOpen?'เปิด':'ปิด')+' · กันที่นั่งแล้ว '+(state.reservedCount||0)+' / '+(state.capacity||0)+' คน';
  for(const item of buttons){const current=state[item.field]===item.target;item.button.disabled=busy||confirming||stale||state.deleted===true||state.purging===true||typeof state[item.field]!=='boolean'||current;item.button.classList.toggle('is-current',current);item.button.textContent=current?item.label+(item.target?'แล้ว':'อยู่'):item.label;item.button.title=current?'สถานะปัจจุบันของกิจกรรม':item.label;}
  if(confirmation){confirmation.button.disabled=busy||stale||state.deleted===true||state.purging===true||state[confirmation.field]===confirmation.target;if(!busy&&state[confirmation.field]===confirmation.target)confirmation.result.textContent='สถานะนี้ถูกตั้งไว้แล้ว กรุณาปิดหน้าต่าง';else if(!busy&&stale)confirmation.result.textContent='กำลังรอสถานะล่าสุด กรุณาเชื่อมต่อระบบก่อนยืนยัน'}
 }
 function ask(item){
  if(!active()||item.button.disabled)return;
  const modal=document.querySelector('#modal'),body=document.querySelector('#modalBody'),content=document.createElement('section');
  const title=document.createElement('h2');title.textContent=item.label+'?';const name=document.createElement('p');name.textContent=state.name;
  const result=document.createElement('p');result.setAttribute('role','status');
  const confirm=document.createElement('button');confirm.className='primary';confirm.textContent='ยืนยัน'+item.label;
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='ยกเลิก';cancel.onclick=()=>{if(!busy)modal.close()};
  content.append(title,name,result,confirm,cancel);body.replaceChildren(content);delete modal.dataset.applicationId;
  confirming=true;confirmation={...item,button:confirm,content,modal,result};draw();modal.showModal();
  const closed=()=>{if(confirmation?.content===content&&!busy){confirming=false;confirmation=null;draw()}};
  modal.addEventListener('close',closed,{once:true});
  confirm.onclick=async()=>{
   if(!active()||busy||stale||!modal.open||!body.contains(content)||state[item.field]===item.target)return;
   busy=true;cancel.disabled=true;result.textContent='กำลังบันทึก…';message.textContent='กำลังบันทึก กรุณารอสักครู่';const revision=revisions[item.field];draw();
   try{
    await client.operate({action:item.action,eventId:event.id,value:!item.target});
    if(!active())return;
    if(revisions[item.field]===revision)state[item.field]=item.target;
    message.textContent=state[item.field]===item.target?'บันทึกแล้ว · '+item.label:'บันทึกคำสั่งแล้ว · สถานะล่าสุดมีการเปลี่ยนแปลงจากระบบ';
    if(body.contains(content)){busy=false;modal.close()}
   }catch(error){if(active()){message.textContent='ยังบันทึกไม่สำเร็จ';if(body.contains(content))result.textContent=error.message||'บันทึกไม่ได้ กรุณาลองใหม่'}}
   finally{busy=false;if(active()){cancel.disabled=false;if(!modal.open||!body.contains(content)){confirming=false;confirmation=null}draw()}}
  };
 }
 for(const [field,title,open,pause,action] of groups){const group=document.createElement('div');group.className='event-state-group';const label=document.createElement('h4');label.textContent=title;const actions=document.createElement('div');actions.className='event-state-actions';group.append(label,actions);panel.append(group);for(const [target,text] of [[true,open],[false,pause]]){const button=document.createElement('button');button.type='button';button.className='event-state-button '+(target?'primary':'outline');const item={button,field,target,label:text,action};buttons.push(item);button.onclick=()=>ask(item);actions.append(button)}}
 panel.append(message);draw();
 return {
  update(next,metadata={}){if(!active()||next?.id!==event.id)return;for(const field of Object.keys(revisions))if(state[field]!==next[field])revisions[field]++;state={...next};stale=metadata.fromCache===true;if(stale)message.textContent='กำลังตรวจสอบสถานะล่าสุด กรุณารอเชื่อมต่อระบบก่อนเปลี่ยนสถานะ';else if(!busy)message.textContent='สถานะอัปเดตจากระบบแล้ว';draw()},
  unavailable(){if(active()){stale=true;message.textContent='เชื่อมต่อสถานะไม่ได้ กรุณาเชื่อมต่อแล้วเปิดกิจกรรมอีกครั้ง';draw()}},
  dispose(){disposed=true;if(confirmation&&document.querySelector('#modalBody').contains(confirmation.content)){confirmation.modal.close();document.querySelector('#modalBody').replaceChildren()}panel.remove()}
 };
}
