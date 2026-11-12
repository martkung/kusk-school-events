import {registrationWindow,thaiTime} from './registration-window.js';
export function eventAvailability(event){
 const remaining=Math.max(0,Number(event.capacity||0)-Number(event.reservedCount||0));
 const window=registrationWindow(event);const label=window.reason==='waiting'?'เปิดรับสมัคร '+thaiTime(event.opensAtMs):window.reason==='closed'?'ปิดรับสมัครแล้ว':window.reason==='paused'?'พักรับสมัคร':!window.open?'ยังไม่เปิดรับสมัคร':remaining===0?'เต็มแล้ว':'เปิดรับสมัคร';return {remaining,label,open:window.open&&remaining>0};
}
export function createEventCard(event,index){
 const card=document.createElement('article');card.className='catalog-card';
 const visual=document.createElement('div');visual.className='catalog-poster '+['green','blue','orange','purple'][index%4];
 let url;try{url=new URL(event.posterUrl);if(url.protocol!=='https:')url=null}catch{}
 const fallback=()=>{visual.replaceChildren();const brand=document.createElement('small');brand.textContent='KUSK EVENTS';const name=document.createElement('strong');name.textContent=event.name;name.title=event.name;const school=document.createElement('span');school.textContent='สาธิตเกษตรฯ กำแพงแสน';visual.append(brand,name,school)};
 if(url){const img=document.createElement('img');img.src=url.href;img.alt=event.name;img.loading='lazy';img.onerror=fallback;visual.append(img)}else fallback();
 const info=document.createElement('div');info.className='catalog-info';const title=document.createElement('h3');title.textContent=event.name;
 const date=document.createElement('p');date.className='meta';date.textContent='◷ '+(event.date||'รอประกาศวันจัด');
 const availability=eventAvailability(event);const badge=document.createElement('span');badge.className='badge';badge.textContent=availability.label;
 info.append(title,date,badge);const actions=document.createElement('div');actions.className='catalog-actions';card.append(visual,info,actions);
 return {card,actions,openForm:()=>{card.classList.add('enrollment-open')}};
}
