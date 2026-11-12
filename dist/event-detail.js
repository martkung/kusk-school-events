import {thaiTime} from './registration-window.js';
import {eventAvailability} from './event-card.js';
export function openEventDetail(event,onApply,{application,actionLabel,allowAction=false}={}){
 const modal=document.querySelector('#modal'),body=document.querySelector('#modalBody');body.replaceChildren();
 const heading=document.createElement('h2');heading.textContent=event.name;body.append(heading);if(event.isTest===true){const note=document.createElement('p');note.className='pilot-demo-note';note.textContent='กิจกรรมสาธิต ไม่มีการจัดงานจริง · การสมัครและเช็คอินจะบันทึกในระบบสำหรับทดลองใช้งาน';body.append(note)}
 if(event.posterUrl){try{const url=new URL(event.posterUrl);if(url.protocol==='https:'){const img=document.createElement('img');img.src=url.href;img.alt=event.name;img.className='detail-poster';img.onerror=()=>img.remove();body.append(img)}}catch{}}
 const info=document.createElement('div');info.className='detail-copy';
 for(const text of ['วันและเวลา: '+(event.date||'รอประกาศ'),'สถานที่: '+(event.place||'รอประกาศ')]){const p=document.createElement('p');p.textContent=text;info.append(p)}
 const title=document.createElement('h3');title.textContent='รายละเอียดกิจกรรม';const description=document.createElement('p');description.className='event-description';description.textContent=event.description||'ยังไม่มีรายละเอียดเพิ่มเติม';info.append(title,description);
 if(event.registrationMode==='scheduled'){const times=document.createElement('p');times.className='sub';times.textContent='รับสมัคร '+thaiTime(event.opensAtMs)+' ถึง '+thaiTime(event.closesAtMs)+' (เวลาไทย)';info.append(times)}
 const availability=eventAvailability(event),status=document.createElement('p');status.className='sub';status.textContent=availability.label+' · '+availability.remaining+' ที่นั่งว่าง';info.append(status);
 if(application){status.textContent='ผู้สมัคร: '+application.participantName+' · '+({pending:'รอพิจารณา',approved:'อนุมัติแล้ว',rejected:'ไม่ผ่านการพิจารณา',cancelled:'ยกเลิกแล้ว'})[application.status];const ref=document.createElement('p');ref.className='sub';ref.style.overflowWrap='anywhere';ref.textContent='เลขอ้างอิง '+(application.referenceCode||application.id);info.append(ref)}
 const apply=document.createElement('button');apply.className='primary';apply.textContent=allowAction||availability.open?(actionLabel||'สมัครเข้าร่วมกิจกรรม'):availability.label;apply.disabled=!allowAction&&!availability.open;apply.onclick=()=>{modal.close();onApply()};info.append(apply);
 if(application)apply.remove();
 const back=document.createElement('button');back.className='text-button';back.textContent='กลับไปดูกิจกรรม';back.onclick=()=>modal.close();info.append(back);body.append(info);modal.showModal();
 const refresh=()=>{if(!modal.open||!body.contains(info)){clearInterval(timer);return}if(application)return;const latest=eventAvailability(event);status.textContent=latest.label+' · '+latest.remaining+' ที่นั่งว่าง';apply.disabled=!allowAction&&!latest.open;apply.textContent=allowAction||latest.open?(actionLabel||'สมัครเข้าร่วมกิจกรรม'):latest.label};
 const timer=setInterval(refresh,1000);modal.addEventListener('close',()=>clearInterval(timer),{once:true});
}
