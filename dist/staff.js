import {mountEventStatus} from './event-status-controls.js';
import {confirmDeleteEvent,mountEventTrash} from './event-deletion.js';
import {mountAdminHealth} from './admin-health.js';
import {mountAdminBanners} from './admin-banners.js';
import {latestLoad} from './catalog-state.js';
import {mountStaffManager} from './staff-manager.js';
import {mountApplicationReview} from './application-review.js';
import {connectFirebase} from './firebase-client.js';
import {mountEventForm} from './admin-event-form.js';
import {mountAdminTabs} from './admin-tabs.js';
import {mountPassCheckin} from './event-pass.js';
import {mountReport,mountAudit} from './reports.js';
import {mountPosterSettings} from './poster-picker.js';
import {mountAdminCatalog} from './admin-catalog.js';
import {mountEventShare} from './event-share.js';
import {mountEventEditor} from './admin-edit-event.js';
let generation=0,unsubscribe=()=>{},stopReview=()=>{},stopCatalog=()=>{},stopBanners=()=>{},stopTrash=()=>{},stopStatus=()=>{};const loads=latestLoad(),accounts=latestLoad();
function clearStaffModal(){const modal=document.querySelector('#modal');if(modal.open)modal.close();document.querySelector('#modalBody').replaceChildren()}
let adminTab='overview',chosenEvent='',workspaceActive=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function page(){const g=++generation;accounts.cancel();if(workspaceActive)clearStaffModal();workspaceActive=['#staff','#admin'].includes(location.hash);unsubscribe();stopReview();stopStatus();stopCatalog();stopBanners();stopTrash();loads.cancel();if(!['#staff','#admin'].includes(location.hash))return;
 const main=document.querySelector('#app');main.innerHTML='<section><h2>พื้นที่เจ้าหน้าที่</h2><p class="sub">เฉพาะกิจกรรมและหน้าที่ที่ได้รับมอบหมาย</p><div id="staffContent" role="status">กำลังโหลด…</div></section>';const root=main.querySelector('#staffContent');
 try{const client=await connectFirebase();if(g!==generation)return;
 unsubscribe=client.observeAccount(async user=>{if(g!==generation)return;const sameAccount=accounts.begin();clearStaffModal();stopReview();stopStatus();stopCatalog();stopBanners();stopTrash();loads.cancel();root.replaceChildren();if(!user){root.innerHTML='<a href="#real-account">เข้าสู่ระบบเพื่อทำงาน →</a>';return}
 let statusControls=null,liveCatalog=null,liveMetadata=null;
 const uid=user.uid,active=()=>g===generation&&sameAccount()&&client.auth.currentUser?.uid===uid;
 try{const context=await client.staffContext();if(!active())return;
 const isAdminPage=location.hash==='#admin';
 main.querySelector('h2').textContent=isAdminPage?'จัดการระบบโรงเรียน':'งานที่ได้รับมอบหมาย';
 if(isAdminPage&&!context.admin){root.innerHTML='<p>บัญชีนี้ไม่มีสิทธิ์ Admin</p><a href="#staff">ไปพื้นที่เจ้าหน้าที่ →</a>';return}
 if(context.admin&&isAdminPage)mountAdminHealth(root,client,active);
 const workspace=context.admin&&isAdminPage?mountAdminTabs(root,adminTab):null;
 if(workspace){workspace.onChange(tab=>{const previous=adminTab;adminTab=tab;if(['banners','trash'].includes(previous)||['banners','trash'].includes(tab))page()});const form=mountEventForm(workspace.panels.get('create'),client,eventId=>{chosenEvent=eventId;adminTab='settings';page()});form.open=true;form.querySelector('summary').hidden=true;}
 if(workspace&&adminTab==='banners'){stopBanners=mountAdminBanners(workspace.panels.get('banners'),client,active);return}
 if(workspace&&adminTab==='trash'){stopTrash=mountEventTrash(workspace.panels.get('trash'),client,active);return}
 const removeEvent=event=>confirmDeleteEvent(event,client,()=>{chosenEvent='';adminTab='overview';page()},active);
 let events=context.events;if(context.admin){events=await client.loadAdminEvents();if(!active())return}
 if(workspace)mountAdminCatalog(workspace.panels.get('overview'),events,eventId=>{chosenEvent=eventId;adminTab='settings';page()},removeEvent);
 if(!events.length){const p=document.createElement('p');p.textContent=context.admin?'ยังไม่มีกิจกรรม สามารถสร้างกิจกรรมหรือจัดการประชาสัมพันธ์ได้':'ยังไม่ได้รับมอบหมายกิจกรรม กรุณาติดต่อ Admin';root.append(p);if(workspace&&adminTab!=='banners')workspace.select('create');return}
 const select=document.createElement('select');select.setAttribute('aria-label','เลือกกิจกรรม');events.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.eventName||e.name;select.append(o)});if(events.some(e=>e.id===chosenEvent))select.value=chosenEvent;const eventLabel=document.createElement('label');eventLabel.textContent='กิจกรรมที่กำลังจัดการ';eventLabel.append(select);(workspace?.eventArea||root).append(eventLabel);const area=document.createElement('div');(workspace?.panels.get('applications')||root).append(area);
 async function load(after){const latest=loads.begin();stopReview();stopStatus();statusControls=null;const eventId=select.value;const loaded=()=>latest()&&active()&&select.value===eventId;area.textContent='กำลังโหลด…';try{const data=await client.operate({action:'list',eventId,after});if(!loaded())return;area.replaceChildren();if(workspace){workspace.panels.get('staff').replaceChildren();workspace.panels.get('settings').replaceChildren();workspace.panels.get('reports').replaceChildren();workspace.panels.get('checkin').replaceChildren();workspace.panels.get('audit').replaceChildren()}
 if(context.admin&&isAdminPage){const latestEvents=await client.loadAdminEvents();if(!loaded())return;events=latestEvents;const currentEvent=events.find(e=>e.id===eventId);if(currentEvent)mountEventShare(workspace?.panels.get('settings')||area,currentEvent);if(currentEvent)mountEventEditor(workspace?.panels.get('settings')||area,client,currentEvent,()=>page());if(currentEvent){const remove=document.createElement('button');remove.className='danger-outline';remove.textContent='ลบกิจกรรมนี้';remove.onclick=()=>removeEvent(currentEvent);(workspace?.panels.get('settings')||area).append(remove)}mountPosterSettings(workspace?.panels.get('settings')||area,client,eventId);if(currentEvent){statusControls=mountEventStatus(workspace?.panels.get('settings')||area,client,currentEvent,loaded);stopStatus=()=>statusControls?.dispose();const latestState=liveCatalog?.find(item=>item.id===eventId);if(latestState)statusControls.update(latestState,liveMetadata||{})}mountStaffManager(workspace.panels.get('staff'),client,eventId,loaded);}
 if(!data.items.length){const p=document.createElement('p');p.textContent='ไม่มีใบสมัครในหน้านี้';area.append(p)}
 const rights=context.admin?['review','checkin','reports','admin']:events.find(e=>e.id===eventId).permissions;const stillCurrent=loaded;if(context.admin&&workspace){mountAudit(workspace.panels.get('audit'),client,eventId,stillCurrent)}if(rights.includes('reports'))mountReport(workspace?.panels.get('reports')||area,client,eventId,stillCurrent);let review;if(rights.includes('checkin'))mountPassCheckin(workspace?.panels.get('checkin')||area,client,eventId,id=>review?.markCheckedIn(id),stillCurrent);
  review=mountApplicationReview(area,client,eventId,data,rights,stillCurrent,confirmAction);stopReview=()=>review.dispose();
 }catch(e){if(loaded())area.textContent=e.message||'โหลดไม่ได้'}}
 async function confirmAction(title,operation){const selectedEvent=select.value;const modal=document.querySelector('#modal'),body=document.querySelector('#modalBody');body.replaceChildren();const p=document.createElement('p');p.textContent=title+'?';body.append(p);const b=document.createElement('button');b.textContent='ยืนยัน';body.append(b);modal.showModal();b.onclick=async()=>{if(!active()||select.value!==selectedEvent||!body.contains(b)||!modal.open)return;b.disabled=true;try{await operation();if(active()&&select.value===selectedEvent&&body.contains(b)){modal.close();load()}}catch(e){if(active()&&body.contains(b)){p.textContent=e.message;b.disabled=false}}}}
 const watchCatalog=context.admin?client.watchAdminEvents:client.watchEvents;
 stopCatalog=watchCatalog((catalog,metadata)=>{if(!active())return;liveCatalog=catalog;liveMetadata=metadata;const visible=catalog.filter(event=>event.deleted!==true),byId=new Map(visible.map(event=>[event.id,event]));if(!byId.has(select.value)&&metadata?.fromCache===false){stopReview();loads.cancel();if(context.admin){chosenEvent='';page()}else area.textContent='กิจกรรมนี้ไม่เปิดให้บริการแล้ว';return}if(context.admin){events=visible;const overview=workspace?.panels.get('overview');if(overview){const query=overview.querySelector('input')?.value||'';overview.replaceChildren();mountAdminCatalog(overview,events,eventId=>{chosenEvent=eventId;adminTab='settings';page()},removeEvent);const input=overview.querySelector('input');if(input){input.value=query;input.dispatchEvent(new Event('input'))}}}for(const option of [...select.options]){const event=byId.get(option.value);if(event)option.textContent=event.name;else if(metadata?.fromCache===false)option.remove()}const latestState=byId.get(select.value);if(latestState)statusControls?.update(latestState,metadata)},()=>statusControls?.unavailable());
 select.onchange=()=>{chosenEvent=select.value;load()};load();
 }catch{if(active())root.textContent='โหลดสิทธิ์ไม่ได้ กรุณาลองเข้าสู่ระบบใหม่'}
 });}catch{root.textContent='เชื่อมต่อไม่ได้ กรุณาลองใหม่'}}
const footer=document.querySelector('footer'),link=document.createElement('a');link.href='#staff';link.textContent='สำหรับเจ้าหน้าที่ →';footer.append(link);window.addEventListener('hashchange',page);page();
