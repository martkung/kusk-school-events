import {createEventCard} from './event-card.js';
import {openEventDetail} from './event-detail.js';
import {showPass} from './event-pass.js';
import {currentApplication} from './catalog-state.js';
export function myActivityCard(record,event,index,client){
 const latest=currentApplication(record,event),detail={...event,id:record.eventId,name:latest.eventName,date:latest.eventDate,registrationOpen:false};
 const {card,actions}=createEventCard(detail,index);
 const available=!!event&&event.deleted!==true&&event.published!==false;
 const badge=card.querySelector('.badge');badge.textContent=({pending:'รอพิจารณา',approved:'อนุมัติแล้ว',rejected:'ไม่ผ่านการพิจารณา',cancelled:'ยกเลิกแล้ว',deleted:'ใบสมัครถูกลบโดยผู้ดูแล'})[record.status]||'กำลังตรวจสอบ';if(record.checkedIn)badge.textContent+=' · เช็คอินแล้ว';
 const poster=card.querySelector('.catalog-poster');poster.tabIndex=0;poster.setAttribute('role','button');poster.setAttribute('aria-label','ดูรายละเอียด '+latest.eventName);
 const details=()=>openEventDetail(detail,()=>{}, {application:record});
 poster.onclick=details;poster.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();details()}};
 const title=card.querySelector('h3'),link=document.createElement('button');link.className='event-title-button';link.textContent=latest.eventName;link.onclick=details;title.replaceChildren(link);
 card.onclick=e=>{if(!e.target.closest('button,a,[role=button]'))details()};
 if(!available){const notice=document.createElement('p');notice.className='sub';notice.textContent='กิจกรรมนี้ไม่เปิดให้บริการในขณะนี้ ประวัติการสมัครยังเก็บอยู่';actions.append(notice)}
 if(available&&record.status==='approved'){const button=document.createElement('button');button.className='primary';button.textContent='เปิดบัตร QR';button.onclick=()=>showPass(latest);actions.append(button)}
 if(available&&['pending','approved'].includes(record.status)&&!record.checkedIn){const button=document.createElement('button');button.className='text-button';button.textContent='ยกเลิกใบสมัคร';button.onclick=()=>{if(!confirm('ยืนยันยกเลิกใบสมัครและคืนที่นั่ง?'))return;button.disabled=true;client.operate({action:'cancel',eventId:record.eventId,applicationId:record.id}).catch(error=>{button.disabled=false;button.textContent=error.message||'ลองใหม่'})};actions.append(button)}
 return card;
}
