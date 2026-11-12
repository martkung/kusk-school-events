const {createHash}=require('node:crypto');
const {normalizePhone}=require('./phone.cjs');
exports.enroll=async function(request,{db,HttpsError,FieldValue}){
 if(!request.auth)throw new HttpsError('unauthenticated','กรุณาเข้าสู่ระบบ');
 const {eventId,displayName}=request.data||{};
 let phone;try{phone=normalizePhone(request.data?.phone)}catch(error){throw new HttpsError('invalid-argument',error.message)}
 if(typeof eventId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(eventId)||typeof displayName!=='string'||!displayName.trim()||displayName.trim().length>120)throw new HttpsError('invalid-argument','กรุณาระบุชื่อผู้สมัคร หากเปิดหน้าค้างไว้ให้รีเฟรชแล้วลองใหม่');
 const uid=request.auth.uid,id=createHash('sha256').update(JSON.stringify([uid,eventId,'self-v1'])).digest('hex');
 const application=db.doc(`schoolEventApplications/${id}`),event=db.doc(`schoolEventCatalog/${eventId}`);
 const legacy=db.collection('schoolEventApplications').where('ownerUid','==',uid).where('eventId','==',eventId).limit(1);
 return db.runTransaction(async tx=>{
  if(request.auth.token?.line_login===true&&uid.startsWith('line_')){
   const link=await tx.get(db.doc(`schoolEventLineLinks/${uid}`));
   if(!link.exists)throw new HttpsError('permission-denied','บัญชี LINE เปลี่ยนการเชื่อมแล้ว กรุณาเข้าสู่ระบบใหม่');
  }
  const [previous,catalog,existing]=await Promise.all([tx.get(application),tx.get(event),tx.get(legacy)]);
  if(previous.exists)return {id,status:previous.data().status,alreadyApplied:true};
  if(!existing.empty){const record=existing.docs[0];return {id:record.id,status:record.data().status,alreadyApplied:true};}
  if(!catalog.exists)throw new HttpsError('not-found','ไม่พบกิจกรรม');
  const e=catalog.data(),now=Date.now();
  if(e.deleted===true||e.published!==true||!require('./registration-window.cjs').registrationWindow(e,now).open)throw new HttpsError('failed-precondition','กิจกรรมยังไม่เปิดรับสมัครหรืออยู่นอกช่วงรับสมัคร');
  if(!Number.isInteger(e.capacity)||e.capacity<1||!Number.isInteger(e.reservedCount)||e.reservedCount<0)throw new HttpsError('failed-precondition','ข้อมูลจำนวนรับไม่พร้อม');
  if(e.reservedCount>=e.capacity)throw new HttpsError('resource-exhausted','กิจกรรมเต็มแล้ว');
  const reference=await require('./reference-code.cjs').reserveReference(tx,db,id,eventId,HttpsError);
  tx.create(reference.ref,reference.data);
  tx.create(application,{referenceCode:reference.referenceCode,ownerUid:uid,eventId,participantName:displayName.trim(),phone,applicantEmail:request.auth.token?.email||'',registrationMode:'self',eventName:e.name,eventDate:e.date||'',status:'pending',createdAt:FieldValue.serverTimestamp()});
  tx.set(db.doc(`schoolEventProfiles/${uid}`),{displayName:displayName.trim(),phone,updatedAt:FieldValue.serverTimestamp()});
  tx.update(event,{reservedCount:e.reservedCount+1});
  tx.create(db.collection('schoolEventAudit').doc(),{eventId,applicationId:id,actorUid:uid,action:'enroll',to:'pending',at:FieldValue.serverTimestamp()});
  tx.set(db.doc(`schoolEventSignals/${eventId}`),{changedAt:FieldValue.serverTimestamp()});
  return {id,referenceCode:reference.referenceCode,status:'pending',alreadyApplied:false};
 });
};
