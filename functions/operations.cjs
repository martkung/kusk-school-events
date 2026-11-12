exports.operate=async(request,{db,HttpsError,FieldValue,auth})=>{
 if(!request.auth)throw new HttpsError('unauthenticated','กรุณาเข้าสู่ระบบ');
 const uid=request.auth.uid,admin=request.auth.token?.admin===true&&!require('./session-access.cjs').applicantOnly(request.auth.token);
 const {assertSystem,allowed,manageDelegates}=require('./delegation.cjs');
 const {action,eventId,targetUid,permissions,value}=request.data||{};let {applicationId}=request.data||{};
 if(require('./session-access.cjs').applicantOnly(request.auth.token)&&action!=='cancel')throw new HttpsError('permission-denied','บัญชีนี้ไม่ได้รับสิทธิ์เจ้าหน้าที่หรือ Admin');
 if(require('./session-access.cjs').approvedLineAdmin(request.auth.token)){
  const config=(await db.doc('schoolEventSystem/linePilot').get()).data();
  if(config?.enabled!==true||!(config.lineAdminUids||[]).includes(uid))throw new HttpsError('permission-denied','สิทธิ์ Admin ผ่าน LINE สิ้นสุดแล้ว');
 }
 const valid=id=>typeof id==='string'&&/^[\w-]{1,128}$/.test(id);
 if(['lookupDelegate','assignDelegate','listDelegates'].includes(action))return manageDelegates(request,{db,auth,HttpsError,FieldValue});
 const system=admin||!db?[]:allowed((await db.doc('schoolEventDelegates/'+uid).get()).data());
 if(action==='health'){
  if(!admin)throw new HttpsError('permission-denied','เฉพาะ Admin');
  await db.doc('schoolEventSignals/__health__').get();return {ok:true,checkedAt:Date.now()};
 }
 if(['saveBanner','deleteBanner'].includes(action)){
  await assertSystem(request,db,'banners',HttpsError);
  return require('./banners.cjs').banners(request,{db,HttpsError,FieldValue});
 }
 if(!valid(eventId))throw new HttpsError('invalid-argument','กิจกรรมไม่ถูกต้อง');
 if(['deleteEvent','restoreEvent'].includes(action))await assertSystem(request,db,'eventsTrash',HttpsError);
 if(action==='report')return require('./report-list.cjs').reportList(request,{db,HttpsError});
 if(['lookupStaff','listStaff'].includes(action))return require('./staff-directory.cjs').staffDirectory(request,{db,auth,HttpsError});
 let staffUser;
 if(action==='assign'){
  if(!admin)throw new HttpsError('permission-denied','เฉพาะ Admin');
  if(!Array.isArray(permissions)||permissions.some(p=>!['review','checkin','reports','schedule'].includes(p)))throw new HttpsError('invalid-argument','สิทธิ์ไม่ถูกต้อง');
  // Revoking must remain possible even if the target account was disabled/deleted.
  if(permissions.length)staffUser=await require('./staff-directory.cjs').staffIdentity(auth,HttpsError,targetUid);
 }
 const eventRef=db.doc(`schoolEventCatalog/${eventId}`),assignment=db.doc(`schoolEventStaff/${uid}/events/${eventId}`);
 const stamp=()=>FieldValue.serverTimestamp();
 const fail=message=>{throw new HttpsError('permission-denied',message)};
 const can=(staff,permission)=>admin||(permission==='schedule'&&system.includes('registrationControl'))||staff?.active===true&&staff.permissions?.includes(permission);
 if(action==='list'){
  if(!admin&&system.length&&!system.includes('applicationsTrash')){const assigned=await assignment.get();if(!assigned.data()?.active||!assigned.data().permissions?.some(p=>['review','checkin','reports'].includes(p)))return {items:[],next:null}}
  const assigned=await assignment.get();if(!admin&&!system.includes('applicationsTrash')&&assigned.data()?.active===true&&assigned.data().permissions?.includes('schedule')&&!assigned.data().permissions.some(p=>['review','checkin','reports'].includes(p)))return {items:[],next:null};
  const staff=await assignment.get();if(!system.includes('applicationsTrash')&&!can(staff.data(),'review')&&!can(staff.data(),'reports')&&!can(staff.data(),'checkin'))fail('ไม่ได้รับมอบหมายกิจกรรมนี้');
  const available=async()=>{const catalog=await eventRef.get();if(!catalog.exists||catalog.data()?.deleted===true||catalog.data()?.purging===true)throw new HttpsError('failed-precondition','กิจกรรมถูกปิดหรือลบแล้ว กรุณาเลือกรายการใหม่')};await available();
  let q=db.collection('schoolEventApplications').where('eventId','==',eventId).orderBy('__name__').limit(50);
  if(request.data.after){if(!valid(request.data.after))throw new HttpsError('invalid-argument','หน้ารายการไม่ถูกต้อง');q=q.startAfter(request.data.after)}
  const snapshot=await q.get();
  // Recheck after query, so a revoked assignment cannot receive an in-flight result.
  const current=await assignment.get();if(!can(current.data(),'review')&&!can(current.data(),'reports')&&!can(current.data(),'checkin')){await assertSystem(request,db,'applicationsTrash',HttpsError);}
  await available();
  return {items:snapshot.docs.filter(d=>admin||system.includes('applicationsTrash')||d.data().status!=='deleted').map(d=>({id:d.id,...(d.data().checkinSignature?{hasSignature:true}:{}),...(d.data().referenceCode?{referenceCode:d.data().referenceCode}:{}),participantName:d.data().participantName,status:d.data().status,checkedIn:d.data().checkedIn===true})),next:snapshot.size===50?snapshot.docs.at(-1).id:null};
 }
 return db.runTransaction(async tx=>{
  const [event,staff]=await Promise.all([tx.get(eventRef),tx.get(assignment)]);
  if(!admin&&system.length){const latest=allowed((await tx.get(db.doc('schoolEventDelegates/'+uid))).data());system.splice(0,system.length,...latest);}
  if(require('./session-access.cjs').approvedLineAdmin(request.auth.token)){const config=(await tx.get(db.doc('schoolEventSystem/linePilot'))).data();if(config?.enabled!==true||!(config.lineAdminUids||[]).includes(uid))fail('สิทธิ์ Admin ผ่าน LINE สิ้นสุดแล้ว')}
  if(action==='createEvent'){
   await assertSystem(request,db,'createEvents',HttpsError,tx);
   if(eventId.startsWith('__'))throw new HttpsError('invalid-argument','รหัสนี้สงวนไว้สำหรับระบบ');
   const [tombstone,purgeJob]=await Promise.all([tx.get(db.doc(`schoolEventTombstones/${eventId}`)),tx.get(db.doc(`schoolEventPurgeJobs/${eventId}`))]);
   if(tombstone.exists||purgeJob.exists)throw new HttpsError('failed-precondition','รหัสกิจกรรมนี้ถูกลบถาวรแล้ว กรุณาสร้างกิจกรรมด้วยรหัสใหม่');
   if(event.exists)throw new HttpsError('already-exists','รหัสกิจกรรมนี้ถูกใช้แล้ว');
   const data=request.data.event;
   if(!data||!['name','date','place','description'].every(k=>typeof data[k]==='string'&&data[k].trim().length>0&&data[k].length<=2000)||!Number.isInteger(data.capacity)||data.capacity<1||data.capacity>100000)throw new HttpsError('invalid-argument','ข้อมูลกิจกรรมไม่ครบ');
   tx.create(eventRef,{name:data.name.trim(),date:data.date.trim(),place:data.place.trim(),description:data.description.trim(),capacity:data.capacity,reservedCount:0,published:true,registrationOpen:false,checkinOpen:false,createdAt:stamp()});

   tx.create(db.collection('schoolEventAudit').doc(),{eventId,actorUid:uid,action,at:stamp()});return {ok:true};
  }
  if(!event.exists)throw new HttpsError('not-found','ไม่พบกิจกรรม');
  const auditRef=db.collection('schoolEventAudit').doc();
  const audit=(extra)=>{tx.create(auditRef,{eventId,actorUid:uid,action,at:stamp(),...extra});tx.set(db.doc(`schoolEventSignals/${eventId}`),{changedAt:stamp()})};
  if(event.data().purging===true)throw new HttpsError('failed-precondition','กิจกรรมกำลังลบถาวร ไม่สามารถกู้คืนหรือแก้ไขได้');
  if(action==='deleteEvent'){
   await assertSystem(request,db,'eventsTrash',HttpsError,tx);
   if(event.data().deleted===true)return {ok:true,alreadyDone:true};
   if(request.data.confirmation!=='DELETE'||request.data.expectedName!==event.data().name)throw new HttpsError('failed-precondition','กรุณาเปิดข้อมูลล่าสุดและยืนยันชื่อกิจกรรมก่อนลบ');
   tx.update(eventRef,{deleted:true,published:false,registrationOpen:false,checkinOpen:false,deletedAt:stamp(),deletedBy:uid});
   audit({eventName:event.data().name,reservedCount:event.data().reservedCount??0});return {ok:true};
  }
  if(action==='restoreEvent'){
   await assertSystem(request,db,'eventsTrash',HttpsError,tx);
   if(event.data().deleted!==true)return {ok:true,alreadyDone:true};
   tx.update(eventRef,{deleted:false,published:true,registrationOpen:false,checkinOpen:false,deletedAt:null,deletedBy:null});
   audit({eventName:event.data().name});return {ok:true};
  }
  if(event.data().deleted===true)throw new HttpsError('failed-precondition','กิจกรรมอยู่ในถังขยะ กรุณากู้คืนก่อนดำเนินการ');
  if(action==='editEvent'){
   await assertSystem(request,db,'editEvents',HttpsError,tx);const data=request.data.event;
   if(!data||!['name','date','place','description'].every(key=>typeof data[key]==='string'&&data[key].trim().length>0&&data[key].length<=2000)||!Number.isInteger(data.capacity)||data.capacity<1||data.capacity>100000)throw new HttpsError('invalid-argument','กรุณาตรวจข้อมูลกิจกรรม');
   if(request.data.expected&&['name','date','place','description','capacity'].some(key=>request.data.expected[key]!== (event.data()[key]??'')))throw new HttpsError('failed-precondition','กิจกรรมถูกแก้ไขจากหน้าต่างอื่นแล้ว กรุณาเปิดข้อมูลล่าสุดก่อนบันทึก');
   if(data.capacity<event.data().reservedCount)throw new HttpsError('failed-precondition','จำนวนรับต้องไม่น้อยกว่าที่นั่งที่กันไว้แล้ว');
   tx.update(eventRef,{name:data.name.trim(),date:data.date.trim(),place:data.place.trim(),description:data.description.trim(),capacity:data.capacity,updatedAt:stamp()});audit({fields:['name','date','place','description','capacity']});return {ok:true};
  }
  if(action==='setPoster'){
   await assertSystem(request,db,'posters',HttpsError,tx);
   if(typeof request.data.posterUrl!=='string'||request.data.posterUrl.length>2000)throw new HttpsError('invalid-argument','URL โปสเตอร์ไม่ถูกต้อง');
   let url;try{url=new URL(request.data.posterUrl)}catch{throw new HttpsError('invalid-argument','URL โปสเตอร์ไม่ถูกต้อง')}
   const expected='/v0/b/kusk-register.firebasestorage.app/o/';
   let path;try{path=decodeURIComponent(url.pathname.slice(expected.length))}catch{throw new HttpsError('invalid-argument','URL โปสเตอร์ไม่ถูกต้อง')}
   if(url.username||url.password||url.port||url.protocol!=='https:'||url.hostname!=='firebasestorage.googleapis.com'||!url.pathname.startsWith(expected)||!path.startsWith(`schoolEventPosters/${eventId}/`)||!/^schoolEventPosters\/[\w-]+\/[\w-]+\.jpg$/.test(path))throw new HttpsError('invalid-argument','โปสเตอร์ต้องเป็นภาพของกิจกรรมนี้ใน Storage โรงเรียน');
   tx.update(eventRef,{posterUrl:url.href,posterUpdatedAt:stamp()});audit({posterPath:path});return {ok:true};
  }
  if(action==='assign'){
   if(!admin)fail('เฉพาะ Admin');
   if(!valid(targetUid)||!Array.isArray(permissions)||permissions.some(p=>!['review','checkin','reports','schedule'].includes(p)))throw new HttpsError('invalid-argument','สิทธิ์ไม่ถูกต้อง');
   tx.set(db.doc(`schoolEventStaff/${targetUid}/events/${eventId}`),{eventId,eventName:event.data().name,active:permissions.length>0,permissions:[...new Set(permissions)],updatedAt:stamp()});audit({targetUid,permissions,...(staffUser?{targetEmail:staffUser.email}: {})});return {ok:true};
  }
  if(action==='registrationSettings'||action==='saveRegistrationSchedule'){
   if(!can(staff.data(),'schedule'))fail('ไม่ได้รับสิทธิ์จัดการเวลาเปิด–ปิดกิจกรรมนี้');
   const e=event.data(),version=e.scheduleVersion||0;
   if(action==='registrationSettings')return {event:{id:eventId,...e},serverNow:Date.now()};
   if(request.data.expectedVersion!==version)throw new HttpsError('failed-precondition','การตั้งเวลาถูกเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก');
   const settings=request.data.settings;
   if(!settings||!['manual','scheduled'].includes(settings.mode))throw new HttpsError('invalid-argument','รูปแบบการรับสมัครไม่ถูกต้อง');
   let change={registrationMode:settings.mode,scheduleVersion:version+1};
   if(settings.mode==='scheduled'){
    const {opensAtMs,closesAtMs}=settings;
    if(!Number.isSafeInteger(opensAtMs)||!Number.isSafeInteger(closesAtMs)||opensAtMs<946684800000||closesAtMs>7258118400000||opensAtMs>=closesAtMs||closesAtMs<=Date.now())throw new HttpsError('invalid-argument','กรุณาระบุเวลาเปิดก่อนเวลาปิด และเวลาปิดต้องอยู่ในอนาคต');
    Object.assign(change,{opensAtMs,closesAtMs,registrationPaused:e.registrationPaused===true,registrationOpen:false});
   }else Object.assign(change,{opensAtMs:null,closesAtMs:null,opensAt:null,closesAt:null,registrationPaused:false,registrationOpen:e.registrationMode==='scheduled'?false:e.registrationOpen===true});
   tx.update(eventRef,change);audit({before:{mode:e.registrationMode||'manual',opensAtMs:e.opensAtMs??null,closesAtMs:e.closesAtMs??null},after:change});return {ok:true,event:{id:eventId,...e,...change},serverNow:Date.now()};
  }
  if(action==='pauseRegistration'||action==='pauseCheckin'){
   if(action==='pauseRegistration'?!can(staff.data(),'schedule'):!(admin||system.includes('checkinControl')))fail('ไม่ได้รับสิทธิ์เปิด–ปิดกิจกรรมนี้');if(typeof value!=='boolean')throw new HttpsError('invalid-argument','ค่าไม่ถูกต้อง');
   const change=action==='pauseRegistration'?{...(event.data().registrationMode==='scheduled'?{registrationPaused:value}:{registrationOpen:!value}),scheduleVersion:(event.data().scheduleVersion||0)+1}:{checkinOpen:!value};tx.update(eventRef,change);audit({paused:value});return {ok:true,event:{id:eventId,...event.data(),...change},serverNow:Date.now()};
  }
  const shortCode=require('./reference-code.cjs').normalizeReference(applicationId);
  if(shortCode){
   if(!['previewCheckin','checkin'].includes(action))throw new HttpsError('invalid-argument','คำสั่งไม่รองรับเลขอ้างอิง');
   if(!can(staff.data(),'checkin'))fail('ไม่ได้รับมอบหมายเช็คอินกิจกรรมนี้');
   const lookup=await tx.get(db.doc('schoolEventReferences/'+shortCode));
   if(!lookup.exists||lookup.data().retired===true||lookup.data().eventId!==eventId)throw new HttpsError('not-found','ไม่พบเลขอ้างอิงในกิจกรรมนี้');
   applicationId=lookup.data().applicationId;
  }
  if(!valid(applicationId))throw new HttpsError('invalid-argument','ใบสมัครไม่ถูกต้อง');
  const ref=db.doc(`schoolEventApplications/${applicationId}`),snapshot=await tx.get(ref);
  if(!snapshot.exists||snapshot.data().eventId!==eventId)throw new HttpsError('not-found','ไม่พบใบสมัคร');
  const data=snapshot.data();
  if(action==='deleteApplication'){
   await assertSystem(request,db,'applicationsTrash',HttpsError,tx);
   if(data.status==='deleted')return {ok:true,alreadyDone:true};
   if(!['pending','approved','rejected','cancelled'].includes(data.status))throw new HttpsError('failed-precondition','สถานะใบสมัครไม่ถูกต้อง');
   const releaseSeat=!data.checkedIn&&['pending','approved'].includes(data.status);
   if(releaseSeat){const count=event.data().reservedCount;if(!Number.isInteger(count)||count<1)throw new HttpsError('failed-precondition','จำนวนที่นั่งไม่สอดคล้อง กรุณาตรวจสอบก่อนลบ');tx.update(eventRef,{reservedCount:count-1})}
   tx.update(ref,{status:'deleted',statusBeforeDeletion:data.status,seatReleasedOnDeletion:releaseSeat,deletedAt:stamp(),deletedBy:uid,updatedAt:stamp(),updatedBy:uid});audit({applicationId,from:data.status,to:'deleted',seatReleased:releaseSeat});return {ok:true};
  }
  if(action==='restoreApplication'){
   await assertSystem(request,db,'applicationsTrash',HttpsError,tx);
   if(data.status!=='deleted')return {ok:true,alreadyDone:true};
   const original=data.statusBeforeDeletion;
   if(!['pending','approved','rejected','cancelled'].includes(original))throw new HttpsError('failed-precondition','ไม่พบสถานะเดิมสำหรับกู้คืน');
   if(data.seatReleasedOnDeletion){const {reservedCount,capacity}=event.data();if(!Number.isInteger(reservedCount)||reservedCount<0||!Number.isInteger(capacity)||reservedCount>=capacity)throw new HttpsError('failed-precondition','ที่นั่งไม่เพียงพอสำหรับกู้คืน กรุณาเพิ่มจำนวนรับก่อน');tx.update(eventRef,{reservedCount:reservedCount+1})}
   tx.update(ref,{status:original,restoredAt:stamp(),restoredBy:uid,updatedAt:stamp(),updatedBy:uid});audit({applicationId,from:'deleted',to:original});return {ok:true};
  }
  if(data.status==='deleted')throw new HttpsError('failed-precondition','ใบสมัครอยู่ในถังขยะ กรุณากู้คืนก่อนดำเนินการ');
  if(action==='editApplication'){
   if(!can(staff.data(),'review'))fail('ไม่มีสิทธิ์แก้ไขผู้สมัครกิจกรรมนี้');
   const change=request.data.change,expected=request.data.expected;
   if(!change||typeof change.displayName!=='string'||!change.displayName.trim()||change.displayName.length>200)throw new HttpsError('invalid-argument','กรุณาระบุชื่อ–นามสกุลไม่เกิน 200 ตัวอักษร');
   let phone;try{phone=require('./phone.cjs').normalizePhone(change.phone)}catch(error){throw new HttpsError('invalid-argument',error.message)}
   const before={displayName:data.participantName||'',phone:data.phone||''};
   if(!expected||expected.displayName!==before.displayName||expected.phone!==before.phone)throw new HttpsError('failed-precondition','ข้อมูลถูกแก้ไขแล้ว กรุณาปิดแล้วเปิดหน้าต่างแก้ไขใหม่');
   const after={displayName:change.displayName.trim(),phone};
   if(before.displayName===after.displayName&&before.phone===after.phone)return {ok:true,alreadyDone:true};
   tx.update(ref,{participantName:after.displayName,phone,updatedAt:stamp(),updatedBy:uid});audit({applicationId,before,after});return {ok:true};
  }
  if(action==='contact'){
   if(!can(staff.data(),'review'))fail('ไม่มีสิทธิ์ติดต่อผู้สมัครกิจกรรมนี้');
   return {displayName:data.participantName,phone:data.phone||'',email:data.applicantEmail||'',hasSignature:!!data.checkinSignature};
  }
  if(action==='previewCheckin'){
   if(!can(staff.data(),'checkin'))fail('ไม่มีสิทธิ์เช็คอินกิจกรรมนี้');
   return {...(shortCode?{applicationId}:{}),...(data.checkinSignature?{hasSignature:true}:{}),participantName:data.participantName||'ไม่ระบุชื่อ',status:data.status,checkedIn:data.checkedIn===true,checkinOpen:event.data().checkinOpen===true};
  }
  if(action==='checkin'){
   if(!can(staff.data(),'checkin'))fail('ไม่มีสิทธิ์เช็คอินกิจกรรมนี้');
   if(data.status!=='approved'||event.data().checkinOpen!==true)throw new HttpsError('failed-precondition','ยังไม่พร้อมเช็คอิน');
   if(data.checkedIn)return {ok:true,alreadyDone:true};
   tx.update(ref,{checkedIn:true,checkedInAt:stamp(),checkedInBy:uid});audit({applicationId});return {ok:true,alreadyDone:false};
  }
  if(action==='cancel'){if(data.ownerUid!==uid&&!admin)fail('ยกเลิกได้เฉพาะเจ้าของบัญชี');}
  else if(!['approve','reject'].includes(action)||!can(staff.data(),'review'))fail('ไม่มีสิทธิ์พิจารณากิจกรรมนี้');
  const status={approve:'approved',reject:'rejected',cancel:'cancelled'}[action];
  if(data.status===status)return {ok:true,alreadyDone:true};
  if(data.checkedIn||!(data.status==='pending'||action==='cancel'&&data.status==='approved'))throw new HttpsError('failed-precondition','สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่');
  if(action!=='approve'){
   const count=event.data().reservedCount;if(!Number.isInteger(count)||count<1)throw new HttpsError('failed-precondition','จำนวนที่นั่งไม่สอดคล้อง กรุณาติดต่อ Admin');
   tx.update(eventRef,{reservedCount:count-1});
  }
  tx.update(ref,{status,updatedAt:stamp(),updatedBy:uid});audit({applicationId,from:data.status,to:status});return {ok:true,alreadyDone:false};
 });
};
