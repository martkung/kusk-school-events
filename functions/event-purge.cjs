const {createHash,randomUUID}=require('node:crypto');
const {applicantOnly,approvedLineAdmin}=require('./session-access.cjs');
const PHASES=['prepare','applications','assignments','audit','files','signal','nested','finish'];
const stampOf=event=>createHash('sha256').update(JSON.stringify([event.name,event.deletedAt?.toMillis?.()??null])).digest('hex');
const staffPath=(path,id)=>new RegExp('^schoolEventStaff/[^/]+/events/'+id+'$').test(path);
const nextPhase=phase=>PHASES[PHASES.indexOf(phase)+1];
async function eachLimited(items,operation){for(let i=0;i<items.length;i+=5)await Promise.all(items.slice(i,i+5).map(operation))}
exports.purgeEvent=async(request,{db,bucket,HttpsError,FieldValue,now=Date.now})=>{
 if(!request.auth)throw new HttpsError('unauthenticated','กรุณาเข้าสู่ระบบ');
 await require('./delegation.cjs').assertSystem(request,db,'purgeEvents',HttpsError);
 if(approvedLineAdmin(request.auth.token)){const config=(await db.doc('schoolEventSystem/linePilot').get()).data();if(config?.enabled!==true||!(config.lineAdminUids||[]).includes(request.auth.uid))throw new HttpsError('permission-denied','สิทธิ์ Admin ผ่าน LINE สิ้นสุดแล้ว')}
 const {action,eventId,confirmation,expectedName,previewToken}=request.data||{};
 if(!['preview','start','step'].includes(action)||typeof eventId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(eventId)||eventId.startsWith('__'))throw new HttpsError('invalid-argument','กิจกรรมไม่ถูกต้อง');
 const eventRef=db.doc('schoolEventCatalog/'+eventId),jobRef=db.doc('schoolEventPurgeJobs/'+eventId),receiptRef=db.doc('schoolEventTombstones/'+eventId),signalRef=db.doc('schoolEventSignals/'+eventId),prefix='schoolEventPosters/'+eventId+'/',prefixes=[prefix,'schoolEventSignatures/'+eventId+'/'];
 const stamp=()=>FieldValue.serverTimestamp(),query=collection=>db.collection(collection).where('eventId','==',eventId),staffQuery=()=>db.collectionGroup('events').where('eventId','==',eventId).orderBy('__name__');
 const state=job=>({done:false,phase:job.phase,counts:job.counts||null});
 async function counts(){
  const [applications,audit]=await Promise.all([query('schoolEventApplications').count().get(),query('schoolEventAudit').count().get()]);
  let assignments=0,cursor=null;for(;;){let q=staffQuery().limit(250).select();if(cursor)q=q.startAfter(db.doc(cursor));const page=await q.get();assignments+=page.docs.filter(doc=>staffPath(doc.ref.path,eventId)).length;if(page.size<250)break;cursor=page.docs.at(-1).ref.path}
  let files=0;for(const prefix of prefixes){let pageToken;do{const [items,next]=await bucket.getFiles({prefix,maxResults:250,autoPaginate:false,...(pageToken?{pageToken}:{})});if(items.some(file=>!file.name.startsWith(prefix)))throw new HttpsError('failed-precondition','ขอบเขตไฟล์ไม่ถูกต้อง');files+=items.length;pageToken=next?.pageToken}while(pageToken)}
  return {applications:applications.data().count,audit:audit.data().count,assignments,files};
 }
 if(action==='preview'){
  const [event,job,receipt]=await Promise.all([eventRef.get(),jobRef.get(),receiptRef.get()]);
  if(receipt.exists)return {done:true,counts:receipt.data().counts||null};
  if(!event.exists||event.data().deleted!==true)throw new HttpsError('failed-precondition','ลบถาวรได้เฉพาะกิจกรรมในถังขยะ');
  return {done:false,name:event.data().name,previewToken:stampOf(event.data()),inProgress:job.exists,phase:job.data()?.phase||null,counts:job.data()?.counts||await counts()};
 }
 if(action==='start')return db.runTransaction(async tx=>{
  await require('./delegation.cjs').assertSystem(request,db,'purgeEvents',HttpsError,tx);
  const [event,job,receipt]=await Promise.all([tx.get(eventRef),tx.get(jobRef),tx.get(receiptRef)]);
  if(receipt.exists)return {done:true,counts:receipt.data().counts||null};
  if(!event.exists||event.data().deleted!==true)throw new HttpsError('failed-precondition','ลบถาวรได้เฉพาะกิจกรรมในถังขยะ');
  if(confirmation!=='PURGE_EVENT'||expectedName!==event.data().name||previewToken!==stampOf(event.data()))throw new HttpsError('failed-precondition','ข้อมูลเปลี่ยนแล้ว กรุณาตรวจรายการและยืนยันชื่อกิจกรรมอีกครั้ง');
  if(job.exists)return state(job.data());
  if(event.data().purging===true)throw new HttpsError('failed-precondition','สถานะการลบไม่ครบ กรุณาติดต่อผู้ดูแลระบบ');
  tx.update(eventRef,{purging:true,published:false,registrationOpen:false,checkinOpen:false});
  const data={eventId,phase:'prepare',counts:null,startedBy:request.auth.uid,startedAt:stamp(),leaseToken:null,leaseUntil:0,staffCursor:null};tx.create(jobRef,data);return state(data);
 });
 const lease=randomUUID();let job;
 const ready=await db.runTransaction(async tx=>{
  await require('./delegation.cjs').assertSystem(request,db,'purgeEvents',HttpsError,tx);
  const [current,event,receipt]=await Promise.all([tx.get(jobRef),tx.get(eventRef),tx.get(receiptRef)]);
  if(receipt.exists)return {done:true,counts:receipt.data().counts||null};
  if(!current.exists||!event.exists||event.data().deleted!==true||event.data().purging!==true)throw new HttpsError('failed-precondition','กรุณายืนยันเริ่มลบถาวรก่อน');
  job=current.data();if(!PHASES.includes(job.phase)||job.eventId!==eventId)throw new HttpsError('failed-precondition','สถานะงานไม่ถูกต้อง');
  if(job.leaseUntil>now())throw new HttpsError('resource-exhausted','มีคำขอลบกำลังทำงาน กรุณารอสักครู่แล้วกดดำเนินการต่อ');
  tx.update(jobRef,{leaseToken:lease,leaseUntil:now()+360000});return null;
 });
 if(ready)return ready;
 async function update(change){return db.runTransaction(async tx=>{const current=await tx.get(jobRef);if(!current.exists||current.data().leaseToken!==lease)throw new HttpsError('aborted','งานลบเปลี่ยนแล้ว กรุณาตรวจสถานะใหม่');tx.update(jobRef,{...change,leaseToken:null,leaseUntil:0});return state({...job,...change})})}
 try{
  await require('./delegation.cjs').assertSystem(request,db,'purgeEvents',HttpsError);
  if(job.phase==='prepare')return await update({counts:await counts(),phase:'applications'});
  if(['applications','audit'].includes(job.phase)){
   const collection=job.phase==='applications'?'schoolEventApplications':'schoolEventAudit',page=await query(collection).limit(50).select().get();
   for(const doc of page.docs)if(!new RegExp('^'+collection+'/[^/]+$').test(doc.ref.path))throw new HttpsError('failed-precondition','ขอบเขตเอกสารไม่ถูกต้อง');
   await eachLimited(page.docs,doc=>db.recursiveDelete(doc.ref));
   return await update({phase:page.empty?nextPhase(job.phase):job.phase});
  }
  if(job.phase==='assignments'){
   let q=staffQuery().limit(50).select();if(job.staffCursor)q=q.startAfter(db.doc(job.staffCursor));const page=await q.get();
   await eachLimited(page.docs.filter(doc=>staffPath(doc.ref.path,eventId)),doc=>db.recursiveDelete(doc.ref));
   return await update({phase:page.empty?'audit':'assignments',staffCursor:page.docs.at(-1)?.ref.path||null});
  }
  if(job.phase==='files'){
   const uploads=await db.collection('schoolEventCatalog/'+eventId+'/signatureUploads').where('leaseUntil','>',now()).limit(1).get();if(!uploads.empty)throw new HttpsError('resource-exhausted','มีการบันทึกลายเซ็นค้างอยู่ กรุณารอประมาณ 3 นาทีแล้วกดดำเนินการลบต่อ');
   let files=[];for(const prefix of prefixes){const [items]=await bucket.getFiles({prefix,maxResults:50,autoPaginate:false});if(items.some(file=>!file.name.startsWith(prefix)))throw new HttpsError('failed-precondition','ขอบเขตไฟล์ไม่ถูกต้อง');if(items.length){files=items;break}}

   if(files.some(file=>!prefixes.some(prefix=>file.name.startsWith(prefix))))throw new HttpsError('failed-precondition','ขอบเขตไฟล์ไม่ถูกต้อง');
   await eachLimited(files,file=>file.delete({ignoreNotFound:true}));return await update({phase:files.length?'files':'signal'});
  }
  if(job.phase==='signal'){await db.recursiveDelete(signalRef);return await update({phase:'nested'})}
  if(job.phase==='nested'){
   const references=await query('schoolEventReferences').limit(50).get();
   if(!references.empty){await eachLimited(references.docs,doc=>db.runTransaction(async tx=>{const current=await tx.get(doc.ref);if(current.exists&&current.data().eventId===eventId)tx.set(doc.ref,{retired:true})}));return await update({phase:'nested'})}

   const collections=await eventRef.listCollections();for(const collection of collections)if(!collection.path.startsWith(eventRef.path+'/'))throw new HttpsError('failed-precondition','ขอบเขตข้อมูลย่อยไม่ถูกต้อง');
   if(collections.length){await db.recursiveDelete(collections[0]);return await update({phase:'nested'})}return await update({phase:'finish'});
  }
  // Verify live data is gone before removing the catalog pointer and completing the receipt.
  const remaining=await counts();if(remaining.applications)return await update({phase:'applications'});if(remaining.assignments)return await update({phase:'assignments',staffCursor:null});if(remaining.audit)return await update({phase:'audit'});if(remaining.files)return await update({phase:'files'});
  return await db.runTransaction(async tx=>{
   const [current,event]=await Promise.all([tx.get(jobRef),tx.get(eventRef)]);
   if(!current.exists||current.data().leaseToken!==lease||!event.exists||event.data().purging!==true)throw new HttpsError('failed-precondition','สถานะการลบเปลี่ยนแล้ว');
   tx.create(receiptRef,{eventId,counts:current.data().counts||{},startedBy:current.data().startedBy,startedAt:current.data().startedAt,finishedBy:request.auth.uid,finishedAt:stamp()});
   tx.delete(eventRef);tx.delete(jobRef);return {done:true,counts:current.data().counts||null};
  });
 }catch(error){try{await db.runTransaction(async tx=>{const current=await tx.get(jobRef);if(current.exists&&current.data().leaseToken===lease)tx.update(jobRef,{leaseToken:null,leaseUntil:0})})}catch{}throw error}
};
