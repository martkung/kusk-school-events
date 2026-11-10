const valid=id=>typeof id==='string'&&/^[\w-]{1,128}$/.test(id);
exports.staffIdentity=async(auth,HttpsError,uid)=>{
 if(!valid(uid))throw new HttpsError('invalid-argument','บัญชีเจ้าหน้าที่ไม่ถูกต้อง');
 let user;try{user=await auth.getUser(uid)}catch(error){if(error.code==='auth/user-not-found')throw new HttpsError('not-found','ไม่พบบัญชีนี้ กรุณาให้เจ้าหน้าที่เข้าสู่ระบบก่อน');throw error}
 if(user.disabled)throw new HttpsError('failed-precondition','บัญชีนี้ถูกปิดใช้งาน');
 if(user.emailVerified!==true)throw new HttpsError('failed-precondition','บัญชีนี้ยังไม่ยืนยันอีเมล กรุณาให้เจ้าหน้าที่เข้าสู่ระบบด้วย Google ก่อน');
 return {uid:user.uid,displayName:user.displayName||user.email||'ไม่ระบุชื่อ',email:user.email||''};
};
exports.staffDirectory=async(request,{db,auth,HttpsError})=>{
 if(request.auth?.token?.admin!==true)throw new HttpsError('permission-denied','เฉพาะ Admin เท่านั้น');
 const {action,eventId,email,after}=request.data;
 if(action==='lookupStaff'){
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim()))throw new HttpsError('invalid-argument','กรุณาระบุอีเมลให้ถูกต้อง');
  let user;try{user=await auth.getUserByEmail(email.trim())}catch(error){if(error.code==='auth/user-not-found')throw new HttpsError('not-found','ไม่พบบัญชี กรุณาให้เจ้าหน้าที่เข้าสู่ระบบด้วย Google ก่อน แล้วค้นหาอีกครั้ง');throw error}
  if(user.disabled)throw new HttpsError('failed-precondition','บัญชีนี้ถูกปิดใช้งาน');
  if(user.emailVerified!==true)throw new HttpsError('failed-precondition','บัญชีนี้ยังไม่ยืนยันอีเมล กรุณาให้เจ้าหน้าที่เข้าสู่ระบบด้วย Google ก่อน');
  const assignment=await db.doc(`schoolEventStaff/${user.uid}/events/${eventId}`).get();
  return {uid:user.uid,displayName:user.displayName||user.email||'ไม่ระบุชื่อ',email:user.email||'',permissions:assignment.data()?.active===true?assignment.data().permissions||[]:[]};
 }
 let query=db.collectionGroup('events').where('eventId','==',eventId).orderBy('__name__').limit(50);
 if(after){if(typeof after!=='string'||!new RegExp('^schoolEventStaff/[\\w-]{1,128}/events/'+eventId+'$').test(after))throw new HttpsError('invalid-argument','หน้ารายชื่อไม่ถูกต้อง');query=query.startAfter(db.doc(after))}
 const page=await query.get();const docs=page.docs.filter(doc=>new RegExp('^schoolEventStaff/[\\w-]{1,128}/events/'+eventId+'$').test(doc.ref.path));
 const users=docs.length?await auth.getUsers(docs.map(doc=>({uid:doc.ref.path.split('/')[1]}))):{users:[]};const byId=new Map(users.users.map(user=>[user.uid,user]));
 return {items:docs.map(doc=>{const uid=doc.ref.path.split('/')[1],user=byId.get(uid),data=doc.data();return {uid,displayName:user?.displayName||user?.email||'ไม่พบบัญชี',email:user?.email||'',disabled:!user||user.disabled===true,active:data.active===true,permissions:data.permissions||[]}}),next:page.size===50?page.docs.at(-1).ref.path:null};
};
