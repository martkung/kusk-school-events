import {mountLiveCatalog} from './live-catalog.js';
import {mountBannerCarousel} from './banner-carousel.js';
import {connectFirebase} from './firebase-client.js';
import {links} from './roles.js';
let context=null,user=null,authVersion=0,homeVersion=0,stopHome=()=>{},stopBanner=()=>{};
function paint(){
 const route=location.hash||'#home',nav=document.querySelector('nav');nav.replaceChildren();
 for(const [href,title] of links(context)){const a=document.createElement('a');a.href=href;a.textContent=title;if(route===href)a.setAttribute('aria-current','page');nav.append(a)}
 const button=document.querySelector('#account');button.textContent=user?'บัญชีของฉัน':'เข้าสู่ระบบ';button.onclick=()=>location.hash='#real-account';
 let accountName=document.querySelector('#signedInName');
 if(user){
  if(!accountName){accountName=document.createElement('span');accountName.id='signedInName';accountName.className='signed-in-name';button.before(accountName)}
  const name=user.displayName||'ผู้ใช้งาน';accountName.textContent='เข้าสู่ระบบ: '+name;accountName.title=name;
 }else if(accountName)accountName.remove();
 let logout=document.querySelector('#signOut');
 if(user&&!logout){logout=document.createElement('button');logout.id='signOut';logout.className='outline';logout.textContent='ออกจากระบบ';button.after(logout)}
 if(!user&&logout){logout.remove();logout=null}
 if(logout)logout.onclick=async()=>{logout.disabled=true;logout.textContent='กำลังออก…';try{const client=await connectFirebase();await client.signOut();context=null;user=null;location.hash='#home';paint()}catch{logout.disabled=false;logout.textContent='ออกจากระบบ';const toast=document.querySelector('#toast');toast.textContent='ออกจากระบบไม่สำเร็จ กรุณาลองใหม่';toast.style.display='block';setTimeout(()=>toast.style.display='none',3500)}};
 document.body.classList.toggle('backoffice',['#staff','#admin'].includes(route));
 document.querySelector('.notice').textContent=route==='#admin'?'พื้นที่ Admin · จัดการระบบโรงเรียน':route==='#staff'?'พื้นที่เจ้าหน้าที่ · เฉพาะกิจกรรมที่ได้รับมอบหมาย':'เปิดทดลองใช้งาน · KUSK Events โรงเรียนสาธิตเกษตรฯ กำแพงแสน';
}
async function home(){const current=++homeVersion;stopHome();stopBanner();if(!['','#home'].includes(location.hash))return;const main=document.querySelector('#app');
 const artwork=main.querySelector('.hero-art');if(artwork)artwork.innerHTML='<span>ทุกกิจกรรม คือโอกาสครั้งใหม่</span><strong>LEARN.<br>GROW.</strong><small>KUSK · EVENTS</small>';
 const button=main.querySelector('.hero button');if(button){button.textContent='เลือกกิจกรรมของโรงเรียน →';button.onclick=()=>location.hash='#live-events'}
 const quick=main.querySelector('#quickMine');if(quick)quick.onclick=()=>location.hash='#live-mine';
 const hero=main.querySelector('.home-banner-slot,.hero');if(hero){const slot=document.createElement('section');hero.replaceWith(slot);try{const client=await connectFirebase();if(current!==homeVersion)return;stopBanner=mountBannerCarousel(slot,client,{isCurrent:()=>current===homeVersion&&['','#home'].includes(location.hash)})}catch{slot.hidden=true}}
 const listing=main.querySelector('#listing');if(!listing)return;listing.innerHTML='<div class="section-head"><div><h2>กิจกรรมของโรงเรียน</h2><p class="sub">เลือกกิจกรรม แล้วสมัครด้วยบัญชีของคุณ</p></div><a href="#live-events">ดูกิจกรรมทั้งหมด →</a></div><div id="schoolCatalog">กำลังโหลด…</div>';
  try{const client=await connectFirebase();if(current!==homeVersion||!['','#home'].includes(location.hash))return;stopHome=mountLiveCatalog(listing.querySelector('#schoolCatalog'),client,{home:true,isCurrent:()=>current===homeVersion&&['','#home'].includes(location.hash)})}catch{if(current===homeVersion)listing.querySelector('#schoolCatalog').textContent='โหลดกิจกรรมไม่ได้ กรุณาเปลี่ยนหน้าแล้วลองใหม่'}
}
function route(){const aliases={'#events':'#live-events','#mine':'#live-mine','#account':'#real-account'};if(aliases[location.hash]){location.replace(aliases[location.hash]);return}paint();home()}
window.addEventListener('hashchange',route);
const footer=document.querySelector('footer > small');if(footer)footer.textContent='KUSK Events · บริการกิจกรรมของโรงเรียน';
route();
connectFirebase().then(client=>client.observeAccount(async account=>{user=account;const current=++authVersion;context=null;paint();if(!account){context={admin:false,events:[]};paint();return}try{const value=await client.staffContext();if(current!==authVersion||client.auth.currentUser?.uid!==account.uid)return;context=value;paint()}catch{if(current===authVersion){context={admin:false,events:[]};paint()}}})).catch(()=>{});
