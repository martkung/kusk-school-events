import {LINE_LIFF_ID} from './line-sdk.js';
const REASON='LINE_REAUTH_REQUIRED';
export function lineReauthenticationRequired(error){return error?.details?.reason===REASON||error?.lineReauthentication===true}
export function currentLineCredential(liff,now=Date.now){
 // Expiry is a UI hint only. Identity/issuer/audience remain verified on the server.
 let decoded,token;try{decoded=liff.getDecodedIDToken();token=liff.getIDToken()}catch{}
 if(!token||!Number.isFinite(decoded?.exp)||decoded.exp*1000<=now()+30000){const error=new Error('ข้อมูลยืนยัน LINE หมดอายุ กรุณาเข้าสู่ระบบ LINE ใหม่');error.lineReauthentication=true;throw error}
 return token;
}
export function renewLineSession(liff,redirectUri,{replace=url=>location.replace(url)}={}){
 if(liff.isInClient()){replace('https://liff.line.me/'+LINE_LIFF_ID);return}
 liff.logout();liff.login({redirectUri});
}
