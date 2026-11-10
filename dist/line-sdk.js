export const LINE_LIFF_ID='2012417122-9huGTgkq';
let loading;
export async function initializeLine(liffId=LINE_LIFF_ID){
 if(!window.liff){
  loading??=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://static.line-scdn.net/liff/edge/2/sdk.js';
   const timer=setTimeout(()=>{script.remove();loading=null;reject(new Error('โหลด LINE ใช้เวลานาน กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'))},15000);
   script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);script.remove();loading=null;reject(new Error('โหลด LINE ไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'))};document.head.append(script);
  });await loading;
 }
 await window.liff.init({liffId});return window.liff;
}
