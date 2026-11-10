const {createHash}=require('node:crypto');
const CHANNEL='2012417122',LIFF='2012417122-9huGTgkq';
const hash=value=>createHash('sha256').update(value).digest('hex');
exports.verifyLine=async(token,{HttpsError,fetcher=fetch,now=Date.now})=>{
 if(typeof token!=='string'||token.length<100||token.length>8192)throw new HttpsError('invalid-argument','ไม่พบข้อมูลยืนยัน LINE กรุณาเข้าสู่ระบบใหม่');
 let response;try{response=await fetcher('https://api.line.me/oauth2/v2.1/verify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id_token:token,client_id:CHANNEL}),signal:AbortSignal.timeout(8000)})}catch{throw new HttpsError('unavailable','ติดต่อ LINE ไม่ได้ กรุณาลองใหม่')}
 if(!response.ok){
  if(response.status===429)throw new HttpsError('resource-exhausted','LINE รับคำขอจำนวนมาก กรุณารอสักครู่แล้วลองใหม่');
  if(response.status>=500)throw new HttpsError('unavailable','LINE ไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่');
  throw new HttpsError('permission-denied','ยืนยัน LINE ไม่สำเร็จ กรุณาเข้าสู่ระบบ LINE ใหม่',{reason:'LINE_REAUTH_REQUIRED'});
 }
 const data=await response.json();const seconds=Math.floor(now()/1000);
 if(data.iss!=='https://access.line.me'||String(data.aud)!==CHANNEL||!/^U[0-9a-f]{32}$/.test(data.sub)||!Number.isFinite(data.exp)||data.exp<=seconds||!Number.isFinite(data.iat)||data.iat>seconds+60)throw new HttpsError('permission-denied','ข้อมูลยืนยัน LINE ไม่ถูกต้อง กรุณาเข้าสู่ระบบ LINE ใหม่',{reason:'LINE_REAUTH_REQUIRED'});
 return data.sub;
};
exports.linePilot=async(request,{db,auth,HttpsError,FieldValue,fetcher,now=Date.now})=>{
 const action=request.data?.action;
 if(!['status','link','login','unlink'].includes(action))throw new HttpsError('invalid-argument','คำขอไม่ถูกต้อง');
 const configRef=db.doc('schoolEventSystem/linePilot'),config=(await configRef.get()).data();
 const enabled=config?.enabled===true;
 const eligible=user=>!!user&&!user.disabled&&user.emailVerified===true&&(config?.allowedUids||[]).includes(user.uid)&&user.providerData?.some(p=>p.providerId==='google.com');
 const google=request.auth?.token?.firebase?.sign_in_provider==='google.com';
 const fresh=google&&Number.isFinite(request.auth.token.auth_time)&&now()/1000-request.auth.token.auth_time<=600;
 if(action==='status'){
  const user=request.auth?await auth.getUser(request.auth.uid):null;
  const allowed=enabled&&eligible(user);
  const linked=allowed&&(await db.doc(`schoolEventLineLinks/${user.uid}`).get()).exists;
  return {enabled,channelId:CHANNEL,liffId:LIFF,eligible:allowed,linked:!!linked,google,fresh,directLogin:config?.allowNewAccounts===true};
 }
 if(!enabled)throw new HttpsError('failed-precondition','LINE ไม่พร้อมให้บริการในขณะนี้');
 if(action==='link'||action==='unlink'){
  if(!request.auth||!fresh)throw new HttpsError('permission-denied','กรุณาออกแล้วเข้าสู่ระบบด้วย Google ใหม่ก่อนเชื่อมบัญชี');
  if(!eligible(await auth.getUser(request.auth.uid)))throw new HttpsError('permission-denied','บัญชีนี้ไม่ได้รับสิทธิ์เชื่อมบัญชีเดิม');
 }
 let identity;
 if(action!=='unlink')identity=hash(CHANNEL+':'+await exports.verifyLine(request.data.idToken,{HttpsError,fetcher,now}));
 const linkRef=action==='login'?null:db.doc(`schoolEventLineLinks/${request.auth.uid}`);
 const identityRef=identity?db.doc(`schoolEventLineIdentities/${identity}`):null;
 let loginUid,native=false;
 // Both directions are changed atomically. ID tokens and contact details are never persisted.
 await db.runTransaction(async tx=>{
  const latest=(await tx.get(configRef)).data();
  if(latest?.enabled!==true)throw new HttpsError('failed-precondition','LINE ไม่พร้อมให้บริการในขณะนี้');
  const allowed=uid=>(latest.allowedUids||[]).includes(uid);
  if(action==='unlink'){
   if(!allowed(request.auth.uid))throw new HttpsError('permission-denied','บัญชีนี้ไม่ได้รับสิทธิ์เชื่อมบัญชีเดิม');
   const link=await tx.get(linkRef);if(!link.exists)return;
   const ref=db.doc(`schoolEventLineIdentities/${link.data().identity}`),record=await tx.get(ref);
   if(record.exists&&record.data().ownerUid===request.auth.uid)tx.delete(ref);
   tx.delete(linkRef);return;
  }
  const record=await tx.get(identityRef);
  if(action==='link'){
   const link=await tx.get(linkRef),uid=request.auth.uid;
   if(!allowed(uid))throw new HttpsError('permission-denied','บัญชีนี้ไม่ได้รับสิทธิ์เชื่อมบัญชีเดิม');
   if(link.exists&&link.data().identity!==identity)throw new HttpsError('already-exists','บัญชีนี้เชื่อม LINE อื่นไว้แล้ว');
   let oldLink;
   if(record.exists&&record.data().ownerUid!==uid){
    const oldUid=record.data().ownerUid;
    if(record.data().kind!=='line'||oldUid!=='line_'+identity)throw new HttpsError('already-exists','LINE นี้เชื่อมกับบัญชีอื่นแล้ว');
    oldLink=db.doc(`schoolEventLineLinks/${oldUid}`);
    const [old,applications]=await Promise.all([tx.get(oldLink),tx.get(db.collection('schoolEventApplications').where('ownerUid','==',oldUid).limit(1))]);
    if(!old.exists||old.data().identity!==identity||!applications.empty)throw new HttpsError('failed-precondition','บัญชี LINE นี้มีประวัติแล้ว ระบบไม่รวมบัญชีอัตโนมัติ กรุณาติดต่อผู้ดูแล');
   }
   // Both Google and LINE are freshly proven. Only an empty provisional account may be relinked.
   if(oldLink)tx.delete(oldLink);
   tx.set(identityRef,{ownerUid:uid,channelId:CHANNEL,linkedAt:FieldValue.serverTimestamp()});
   tx.set(linkRef,{identity,channelId:CHANNEL});return;
  }
  if(!record.exists){
   if(latest.allowNewAccounts!==true)throw new HttpsError('permission-denied','ยังไม่เปิดรับบัญชี LINE ใหม่');
   const production=latest.mode==='production',count=latest.newAccountCount||0,max=latest.maxNewAccounts;
   if(!production&&(!Number.isInteger(max)||max<1||max>20||!Number.isInteger(count)||count<0||count>=max))throw new HttpsError('resource-exhausted','ยังไม่สามารถเพิ่มบัญชีได้ กรุณาติดต่อผู้ดูแล');
   loginUid='line_'+identity;native=true;
   const reverseRef=db.doc(`schoolEventLineLinks/${loginUid}`),reverse=await tx.get(reverseRef);
   if(reverse.exists)throw new HttpsError('failed-precondition','พบการเชื่อมบัญชีไม่ตรงกัน กรุณาติดต่อผู้ดูแล');
   tx.create(identityRef,{ownerUid:loginUid,channelId:CHANNEL,kind:'line',linkedAt:FieldValue.serverTimestamp(),lastLoginMs:now()});
   tx.create(reverseRef,{identity,channelId:CHANNEL});if(!production)tx.update(configRef,{newAccountCount:count+1});return;
  }
  loginUid=record.data().ownerUid;
  native=record.data().kind==='line'&&loginUid==='line_'+identity;
  if(native?latest.allowNewAccounts!==true:!allowed(loginUid))throw new HttpsError('permission-denied','บัญชี LINE นี้ไม่ได้รับสิทธิ์เข้าใช้งาน');
  const reverse=await tx.get(db.doc(`schoolEventLineLinks/${loginUid}`));
  if(!reverse.exists||reverse.data().identity!==identity)throw new HttpsError('permission-denied','การเชื่อมบัญชีสิ้นสุดแล้ว');
  if(now()-(record.data().lastLoginMs||0)<5000)throw new HttpsError('resource-exhausted','กรุณารอสักครู่แล้วลองใหม่');
  tx.update(identityRef,{lastLoginMs:now()});
 });
 if(action!=='login')return {ok:true};
 let user;
 try{user=await auth.getUser(loginUid)}catch(error){
  if(!native||error.code!=='auth/user-not-found')throw error;
  try{user=await auth.createUser({uid:loginUid})}catch(error){if(error.code!=='auth/uid-already-exists')throw error;user=await auth.getUser(loginUid)}
 }
 if(native?user.disabled||user.email||user.providerData?.length:!eligible(user))throw new HttpsError('permission-denied','บัญชีไม่สามารถใช้งานได้');
 // Re-read approval immediately before minting. New LINE identities can never inherit Google roles.
 const latest=(await configRef.get()).data();
 if(latest?.enabled!==true||(native?latest.allowNewAccounts!==true:!(latest.allowedUids||[]).includes(loginUid)))throw new HttpsError('permission-denied','สิทธิ์เข้าใช้งานสิ้นสุดแล้ว');
 const admin=!native&&(latest.lineAdminUids||[]).includes(loginUid)&&user.customClaims?.admin===true;
 return {customToken:await auth.createCustomToken(loginUid,{line_login:true,line_admin:admin,admin,checkin:false,reports:false})};
};
