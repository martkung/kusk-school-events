const {applicantOnly,approvedLineAdmin}=require('./session-access.cjs');
const PERMISSIONS=['createEvents','editEvents','posters','registrationControl','checkinControl','banners','applicationsTrash','eventsTrash','purgeEvents','audit'];
exports.PERMISSIONS=PERMISSIONS;
exports.allowed=data=>data?.active===true&&Array.isArray(data.permissions)?data.permissions.filter(p=>PERMISSIONS.includes(p)):[];
exports.assertSystem=async(request,db,permission,HttpsError,tx)=>{
 if(!request.auth||applicantOnly(request.auth.token))throw new HttpsError('permission-denied','ไม่ได้รับสิทธิ์ดูแลระบบนี้');
 if(request.auth.token?.admin===true){if(approvedLineAdmin(request.auth.token)){const ref=db.doc('schoolEventSystem/linePilot'),snapshot=tx?await tx.get(ref):await ref.get();if(snapshot.data()?.enabled!==true||!snapshot.data().lineAdminUids?.includes(request.auth.uid))throw new HttpsError('permission-denied','สิทธิ์ Admin ผ่าน LINE สิ้นสุดแล้ว')}return;}
 if(!db)throw new HttpsError('permission-denied','ไม่ได้รับสิทธิ์ดูแลระบบนี้');
 const ref=db.doc('schoolEventDelegates/'+request.auth.uid),snapshot=tx?await tx.get(ref):await ref.get();
 if(!exports.allowed(snapshot.data()).includes(permission))throw new HttpsError('permission-denied','ไม่ได้รับมอบหมายสิทธิ์นี้ หรือสิทธิ์ถูกถอนแล้ว');
};
exports.manageDelegates=async(request,{db,auth,HttpsError,FieldValue})=>{
 if(request.auth?.token?.admin!==true||applicantOnly(request.auth.token))throw new HttpsError('permission-denied','เฉพาะ Admin เท่านั้นที่มอบหมายงานทั้งระบบได้');
 const {action,email,targetUid,permissions,after}=request.data||{},directory=require('./staff-directory.cjs');
 if(action==='lookupDelegate'){
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim()))throw new HttpsError('invalid-argument','กรุณาระบุอีเมลให้ถูกต้อง');
  let user;try{user=await auth.getUserByEmail(email.trim())}catch(e){if(e.code==='auth/user-not-found')throw new HttpsError('not-found','ให้เจ้าหน้าที่เข้าสู่ระบบด้วย Google ก่อน แล้วค้นหาอีกครั้ง');throw e}
  const identity=await directory.staffIdentity(auth,HttpsError,user.uid),saved=await db.doc('schoolEventDelegates/'+user.uid).get();return {...identity,version:saved.data()?.version||0,permissions:exports.allowed(saved.data())};
 }
 if(action==='assignDelegate'){
  if(typeof targetUid!=='string'||!/^[\w-]{1,128}$/.test(targetUid)||!Array.isArray(permissions)||permissions.some(p=>!PERMISSIONS.includes(p)))throw new HttpsError('invalid-argument','สิทธิ์ไม่ถูกต้อง');
  const identity=permissions.length?await directory.staffIdentity(auth,HttpsError,targetUid):null;
  return db.runTransaction(async tx=>{await exports.assertSystem(request,db,'',HttpsError,tx);const ref=db.doc('schoolEventDelegates/'+targetUid),old=await tx.get(ref);if(request.data.expectedVersion!==(old.data()?.version||0))throw new HttpsError('failed-precondition','สิทธิ์ถูกแก้ไขแล้ว กรุณาค้นหาบัญชีล่าสุดก่อนบันทึก');tx.set(ref,{version:(old.data()?.version||0)+1,active:permissions.length>0,permissions:[...new Set(permissions)],updatedAt:FieldValue.serverTimestamp(),updatedBy:request.auth.uid});tx.create(db.collection('schoolEventAudit').doc(),{eventId:'__system__',action,actorUid:request.auth.uid,targetUid,targetEmail:identity?.email||'',before:exports.allowed(old.data()),permissions:[...new Set(permissions)],at:FieldValue.serverTimestamp()});return {ok:true}});
 }
 let query=db.collection('schoolEventDelegates').orderBy('__name__').limit(50);
 if(after){if(typeof after!=='string'||!/^[\w-]{1,128}$/.test(after))throw new HttpsError('invalid-argument','หน้ารายการไม่ถูกต้อง');query=query.startAfter(db.doc('schoolEventDelegates/'+after))}
 const page=await query.get(),users=page.docs.length?await auth.getUsers(page.docs.map(doc=>({uid:doc.id}))):{users:[]},byId=new Map(users.users.map(u=>[u.uid,u]));
 return {items:page.docs.map(doc=>{const u=byId.get(doc.id),rights=exports.allowed(doc.data());return {uid:doc.id,displayName:u?.displayName||u?.email||'ไม่พบบัญชี',email:u?.email||'',disabled:!u||u.disabled===true,version:doc.data().version||0,active:rights.length>0,permissions:rights}}),next:page.size===50?page.docs.at(-1).id:null};
};
