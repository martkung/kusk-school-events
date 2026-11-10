import {pendingEvent} from './enrollment-intent.js';
import {mountRealAccount} from './account-auth.js';
import {mountLinePilotLink} from './line-account-link.js';
import {consumeLoginReturn} from './login-return.js';
// Flip only after deployment and verification of shared-project security rules.
const SECURITY_READY=true;
let dispose=()=>{};
let generation=0;
async function renderAccount(){
 const current=++generation;
 if(location.hash!=='#real-account'){dispose();return}
 dispose();
 const main=document.querySelector('#app');
 main.innerHTML='<section class="auth-page"><div class="eyebrow">KUSK EVENTS</div><h2 id="accountHeading">เข้าสู่ระบบ</h2><p class="sub">สมัครกิจกรรม ดูสถานะ และเปิดบัตรเข้าร่วมงานของคุณ</p><div class="auth-announcement" role="note"><strong>เปิดทดลองใช้งานระบบ</strong>เลือกเข้าสู่ระบบด้วย Google หรือ LINE และใช้บัญชีเดิมทุกครั้ง เพื่อดูประวัติและบัตรของคุณได้ครบ</div><div class="panel"><button id="googleAccount" class="primary">กำลังเตรียมช่องทางเข้าสู่ระบบ…</button><p id="accountStatus" role="status" aria-live="polite"></p></div><p class="auth-privacy">โรงเรียนใช้ชื่อ–นามสกุลและเบอร์โทรเพื่อรับสมัคร ติดต่อเกี่ยวกับกิจกรรม และตรวจสอบการเข้าร่วมงาน กรุณากรอกข้อมูลที่ถูกต้อง และออกจากระบบเมื่อใช้เครื่องร่วมกับผู้อื่น</p><p class="auth-help">เจ้าหน้าที่และผู้ดูแลระบบใช้ช่องทางเดียวกันได้ เมนูจัดการจะแสดงตามสิทธิ์ที่ได้รับมอบหมาย</p><a class="auth-back" href="#home">← กลับดูกิจกรรม</a></section>';
 const area=document.createElement('section');main.querySelector('.auth-page').append(area);
 let accountVersion=0;
 const cleanup=await mountRealAccount({button:document.querySelector('#googleAccount'),container:document.querySelector('#accountStatus'),securityReady:SECURITY_READY,onAccount:async(user,client)=>{
  if(current!==generation||location.hash!=='#real-account')return;
  const version=++accountVersion;const active=()=>current===generation&&version===accountVersion&&client.auth.currentUser?.uid===user?.uid;area.replaceChildren();main.querySelector('#accountHeading').textContent=user?'บัญชีของฉัน':'เข้าสู่ระบบ';if(!user)return;
    const heading=document.createElement('h2');heading.textContent='ข้อมูลของฉัน';area.append(heading);
  const form=document.createElement('form');form.innerHTML='<label for="myName">ชื่อ–นามสกุลสำหรับสมัครกิจกรรม<input id="myName" name="displayName" required maxlength="120" autocomplete="name"></label><label>เบอร์โทรศัพท์<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="0812345678"></label><p class="sub">โรงเรียนใช้เบอร์นี้เพื่อติดต่อเกี่ยวกับกิจกรรม</p><p class="sub">ใช้เติมในการสมัครครั้งต่อไป การแก้ข้อมูลไม่เปลี่ยนข้อมูลในใบสมัครหรือบัตรเดิม</p><button class="primary" type="submit">บันทึกข้อมูลของฉัน</button><p role="status"></p>';area.append(form);let edited=false;form.oninput=()=>edited=true;form.onsubmit=e=>e.preventDefault();const saveButton=form.querySelector('button');saveButton.disabled=true;
  if(user.email){const email=document.createElement('p');email.className='sub';email.textContent='อีเมลบัญชี: '+user.email;area.append(email)}
  mountLinePilotLink(area,client);
  try{const profile=await client.loadProfile();if(!active())return;if(!edited){form.elements.displayName.value=profile.displayName||user.displayName||'';form.elements.phone.value=profile.phone||''}}catch{if(!active())return;if(!edited)form.elements.displayName.value=user.displayName||'';form.querySelector('[role=status]').textContent='โหลดชื่อที่บันทึกไม่ได้ กรอกชื่อใหม่แล้วลองบันทึกได้'}
  if(!active())return;saveButton.disabled=false;form.onsubmit=async event=>{event.preventDefault();if(!active())return;const button=form.querySelector('button'),status=form.querySelector('[role=status]');button.disabled=true;try{await client.saveProfile(form.elements.displayName.value,form.elements.phone.value);if(!active())return;status.textContent='บันทึกแล้ว';const target=consumeLoginReturn();if(target)location.hash=target;else if(pendingEvent())location.hash='#live-events'}catch(error){if(active())status.textContent=error.message||'บันทึกไม่ได้ กรุณาลองใหม่'}finally{if(active())button.disabled=false}};
 }});
 if(current!==generation||location.hash!=='#real-account'){cleanup();return}dispose=cleanup;
}
const link=document.createElement('a');link.href='#real-account';link.textContent='บัญชีผู้สมัคร';document.querySelector('nav').append(link);
window.addEventListener('hashchange',renderAccount);renderAccount();
