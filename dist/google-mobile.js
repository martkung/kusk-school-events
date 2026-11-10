// Public OAuth web client ID; never store the returned credential.
const CLIENT_ID='364604187830-ur1kgb240tnhtr7v47ba1jiggci53t57.apps.googleusercontent.com';
export function mobileBrowser(nav){return /Android|iPhone|iPad|iPod/i.test(nav.userAgent||'')||nav.platform==='MacIntel'&&nav.maxTouchPoints>1}
let loading;
function loadIdentity(){
 if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
 if(!loading)loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  const timeout=setTimeout(()=>{script.remove();loading=null;reject(new Error('โหลด Google ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วเปิดหน้านี้ใหม่'))},20000);
  script.onload=()=>{clearTimeout(timeout);if(window.google?.accounts?.id)resolve(window.google.accounts.id);else{loading=null;reject(new Error('เบราว์เซอร์นี้เปิด Google Sign-in ไม่ได้ กรุณาเปิดด้วย Chrome หรือ Safari โดยตรง'))}};
  script.onerror=()=>{clearTimeout(timeout);script.remove();loading=null;reject(new Error('โหลด Google ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ต'))};document.head.append(script);
 });return loading;
}
export async function mountMobileGoogle({host,client,onSuccess,onError}){
 let disposed=false,busy=false;
 const id=await loadIdentity();
 host.replaceChildren();
 id.initialize({client_id:CLIENT_ID,auto_select:false,ux_mode:'popup',callback:async response=>{
  if(disposed||busy)return;
  if(!response.credential){onError(new Error('Google ยังไม่ส่งผลเข้าสู่ระบบ กรุณาลองใหม่'));return}
  busy=true;
  try{await client.signInGoogleCredential(response.credential);if(!disposed)await onSuccess()}
  catch(error){if(!disposed)onError(error)}finally{busy=false}
 }});
 id.renderButton(host,{type:'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular',width:Math.min(320,Math.max(200,host.clientWidth||300))});
 return ()=>{disposed=true;host.replaceChildren()};
}
