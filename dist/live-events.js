import {connectFirebase} from './firebase-client.js';
import {updateOpenPass} from './event-pass.js';
import {myActivityCard} from './my-activity-card.js';
import {mountLiveCatalog} from './live-catalog.js';
import {mountMyActivitiesLogin} from './my-activities-login.js';
let generation=0,accountVersion=0,stopAccount=()=>{},stopContent=()=>{};
async function page(){
 const version=++generation;stopAccount();stopContent();const route=location.hash;if(!['#live-events','#live-mine'].includes(route))return;
 const main=document.querySelector('#app');main.innerHTML='<section class="event-catalog"><h2></h2><div class="live-content"></div></section>';main.querySelector('h2').textContent=route==='#live-mine'?'กิจกรรมของฉัน':'กิจกรรมทั้งหมด';const root=main.querySelector('.live-content');root.textContent='กำลังโหลด…';
 try{const client=await connectFirebase();if(version!==generation)return;stopAccount=client.observeAccount(user=>{
  if(version!==generation)return;const account=++accountVersion;stopContent();updateOpenPass([]);const current=()=>version===generation&&account===accountVersion&&client.auth.currentUser?.uid===user?.uid;
  root.replaceChildren();if(route==='#live-events'){stopContent=mountLiveCatalog(root,client,{user,isCurrent:current});return}
  if(!user){stopContent=mountMyActivitiesLogin(root);return}
  let catalog=[],applications=null,cache=true,catalogCache=true;const paint=()=>{if(!current()||applications===null)return;updateOpenPass(applications,catalog);root.replaceChildren();const sync=document.createElement('p');sync.className='sub';sync.textContent=cache||catalogCache?'กำลังเชื่อมต่อ · ข้อมูลอาจยังไม่ล่าสุด':'อัปเดตอัตโนมัติ';const grid=document.createElement('div');grid.className='event-card-grid';applications.forEach((record,index)=>grid.append(myActivityCard(record,catalog.find(event=>event.id===record.eventId),index,client)));if(!applications.length){const empty=document.createElement('p');empty.textContent='ยังไม่มีใบสมัคร';grid.append(empty);const link=document.createElement('a');link.href='#live-events';link.textContent='เลือกกิจกรรม →';grid.append(link)}root.append(sync,grid)};
  const stopCatalog=client.watchEvents((events,metadata)=>{if(!current())return;catalog=events;catalogCache=metadata.fromCache;paint()},()=>{});
  const stopApplications=client.watchMyApplications((records,metadata)=>{if(!current())return;applications=records;cache=metadata.fromCache;paint()},()=>{if(current()){updateOpenPass([]);root.textContent='เชื่อมต่อใบสมัครไม่ได้ กรุณาเปลี่ยนหน้าแล้วลองใหม่'}});
  stopContent=()=>{stopCatalog();stopApplications()};
 });}catch{if(version===generation)root.textContent='เชื่อมต่อไม่ได้ กรุณาลองใหม่'}
}
window.addEventListener('hashchange',page);page();
