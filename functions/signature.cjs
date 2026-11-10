const {createHash,randomUUID}=require('node:crypto');
const {PNG}=require('pngjs');
const {applicantOnly,approvedLineAdmin}=require('./session-access.cjs');
const CONSENT_VERSION='attendance-v1';
function signatureBytes(value,HttpsError){
 if(typeof value!=='string'||value.length>280000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw new HttpsError('invalid-argument','รูปแบบลายเซ็นไม่ถูกต้อง');
 const bytes=Buffer.from(value.slice(22),'base64');if(bytes.length<60||bytes.length>200000||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new HttpsError('invalid-argument','ภาพลายเซ็นไม่ถูกต้อง');
 if(bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR')throw new HttpsError('invalid-argument','ส่วนหัวภาพไม่ถูกต้อง');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);if(width<200||height<80||width>1024||height>512)throw new HttpsError('invalid-argument','ขนาดลายเซ็นไม่ถูกต้อง');
 let offset=8,headers=0,sawData=false,sawEnd=false,chunks=0;
 while(offset<bytes.length){if(offset+12>bytes.length||++chunks>1024)throw new HttpsError('invalid-argument','โครงสร้างภาพไม่ถูกต้อง');const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),end=offset+12+length;if(end>bytes.length||!type.match(/^[A-Za-z]{4}$/)||['acTL','fcTL','fdAT'].includes(type))throw new HttpsError('invalid-argument','โครงสร้างภาพไม่ถูกต้อง');if(type==='IHDR'&&(++headers!==1||offset!==8||length!==13))throw new HttpsError('invalid-argument','ส่วนหัวภาพซ้ำหรือไม่ถูกต้อง');if(type==='IDAT')sawData=true;if(type==='IEND'){if(length!==0||end!==bytes.length)throw new HttpsError('invalid-argument','ส่วนท้ายภาพไม่ถูกต้อง');sawEnd=true}offset=end}
 if(headers!==1||!sawData||!sawEnd)throw new HttpsError('invalid-argument','ภาพไม่สมบูรณ์');
 let image;try{image=PNG.sync.read(bytes,{checkCRC:true})}catch{throw new HttpsError('invalid-argument','อ่านภาพลายเซ็นไม่ได้')}
 if(image.width!==width||image.height!==height)throw new HttpsError('invalid-argument','ขนาดภาพไม่ตรงกับส่วนหัว');
 let ink=0;for(let i=0;i<image.data.length;i+=4)if(image.data[i+3]>100&&image.data[i]<180&&image.data[i+1]<180&&image.data[i+2]<180)ink++;
 if(ink<100||ink>width*height*.65)throw new HttpsError('invalid-argument','กรุณาลงลายเซ็นให้ครบก่อนบันทึก');
 const normalized=PNG.sync.write(image);if(normalized.length>200000)throw new HttpsError('invalid-argument','ไฟล์ลายเซ็นใหญ่เกินไป กรุณาเซ็นใหม่');return normalized;
}
async function signature(request,{db,bucket,HttpsError,FieldValue,now=Date.now}){
 if(!request.auth)throw new HttpsError('unauthenticated','กรุณาเข้าสู่ระบบ');
 const uid=request.auth.uid,token=request.auth.token||{},admin=token.admin===true&&!applicantOnly(token);
 if(applicantOnly(token))throw new HttpsError('permission-denied','เฉพาะเจ้าหน้าที่ที่ได้รับมอบหมาย');
 const {action,eventId,applicationId,captureId,consent,expectedName,signaturePng}=request.data||{},valid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id),uuid=id=>typeof id==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id);
 if(!['save','view'].includes(action)||!valid(eventId)||!valid(applicationId))throw new HttpsError('invalid-argument','ข้อมูลลายเซ็นไม่ถูกต้อง');
 const eventRef=db.doc('schoolEventCatalog/'+eventId),appRef=db.doc('schoolEventApplications/'+applicationId),staffRef=db.doc('schoolEventStaff/'+uid+'/events/'+eventId),stamp=()=>FieldValue.serverTimestamp();
 async function read(tx,saving){
  const [event,app,staff]=await Promise.all([tx.get(eventRef),tx.get(appRef),tx.get(staffRef)]);
  if(approvedLineAdmin(token)){const config=(await tx.get(db.doc('schoolEventSystem/linePilot'))).data();if(config?.enabled!==true||!(config.lineAdminUids||[]).includes(uid))throw new HttpsError('permission-denied','สิทธิ์ Admin ผ่าน LINE สิ้นสุดแล้ว')}
  if(!admin&&!(staff.data()?.active===true&&staff.data().permissions?.some(p=>(saving?['checkin']:['checkin','reports','review']).includes(p))))throw new HttpsError('permission-denied','ไม่ได้รับมอบหมายหน้าที่ในกิจกรรมนี้');
  if(!event.exists||event.data().purging===true||!app.exists||app.data().eventId!==eventId||app.data().status==='deleted')throw new HttpsError('not-found','ไม่พบข้อมูลที่พร้อมใช้งาน');
  if(saving&&(event.data().deleted===true||event.data().checkinOpen!==true||app.data().status!=='approved'))throw new HttpsError('failed-precondition','กิจกรรมยังไม่เปิดเช็คอินหรือใบสมัครไม่ได้รับอนุมัติ');
  return app.data();
 }
 if(action==='view'){
  const app=await db.runTransaction(tx=>read(tx,false)),saved=app.checkinSignature;
  if(!saved)throw new HttpsError('not-found','ยังไม่มีลายเซ็น');
  const prefix='schoolEventSignatures/'+eventId+'/'+applicationId+'/';if(!saved.path?.startsWith(prefix)||!uuid(saved.path.slice(prefix.length,-4))||!saved.path.endsWith('.png'))throw new HttpsError('failed-precondition','ตำแหน่งลายเซ็นไม่ถูกต้อง');
  const [bytes]=await bucket.file(saved.path,{generation:saved.generation}).download();if(bytes.length>200000||createHash('sha256').update(bytes).digest('hex')!==saved.sha256)throw new HttpsError('failed-precondition','ภาพไม่ตรงกับข้อมูลที่บันทึก');
  await db.runTransaction(tx=>read(tx,false));
  return {sha256:saved.sha256,signaturePng:'data:image/png;base64,'+bytes.toString('base64'),signerName:saved.signerName,recordedAtMs:saved.at?.toMillis?.()||null,consentVersion:saved.consentVersion};
 }
 if(!uuid(captureId)||consent!==true||typeof expectedName!=='string')throw new HttpsError('invalid-argument','กรุณาตรวจชื่อและยืนยันการลงลายเซ็น');
 // Authorize before decoding or uploading an image.
 const previous=await db.runTransaction(tx=>read(tx,true));if(previous.checkinSignature)return {ok:true,alreadyDone:true,hasSignature:true};
 const leaseOwner=randomUUID(),bytes=signatureBytes(signaturePng,HttpsError),sha256=createHash('sha256').update(bytes).digest('hex'),path='schoolEventSignatures/'+eventId+'/'+applicationId+'/'+captureId+'.png',uploadRef=db.doc('schoolEventCatalog/'+eventId+'/signatureUploads/'+captureId),file=bucket.file(path);
 const reserved=await db.runTransaction(async tx=>{const app=await read(tx,true),upload=await tx.get(uploadRef);if(app.checkinSignature)return false;if(app.participantName!==expectedName)throw new HttpsError('failed-precondition','ชื่อผู้เข้าร่วมเปลี่ยนแล้ว กรุณาตรวจบัตรใหม่ก่อนเซ็น');if(upload.exists&&(upload.data().sha256!==sha256||upload.data().applicationId!==applicationId))throw new HttpsError('failed-precondition','คำขอบันทึกเปลี่ยนแล้ว กรุณาล้างลายเซ็นและลองใหม่');if(upload.exists&&upload.data().leaseUntil>now())throw new HttpsError('resource-exhausted','คำขอลายเซ็นนี้กำลังบันทึก กรุณารอสักครู่แล้วลองใหม่');tx.set(uploadRef,{applicationId,sha256,leaseOwner,leaseUntil:now()+180000});return true});
 if(!reserved)return {ok:true,alreadyDone:true,hasSignature:true};
 async function cleanup(){try{
  const removeFile=await db.runTransaction(async tx=>{const [app,upload]=await Promise.all([tx.get(appRef),tx.get(uploadRef)]);if(!upload.exists||upload.data().leaseOwner!==leaseOwner)return false;if(app.data()?.checkinSignature?.path===path){tx.delete(uploadRef);return false}tx.update(uploadRef,{leaseUntil:now()+60000});return true});
  if(removeFile){await file.delete({ignoreNotFound:true});await db.runTransaction(async tx=>{const upload=await tx.get(uploadRef);if(upload.exists&&upload.data().leaseOwner===leaseOwner)tx.delete(uploadRef)})}
 }catch{}}
 try{
  try{await file.save(bytes,{timeout:20000,resumable:false,validation:'crc32c',preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:'image/png',cacheControl:'private,no-store',metadata:{sha256,captureId}}})}catch(error){if(Number(error.code)!==412)throw error}
  const [metadata]=await file.getMetadata();if(metadata.metadata?.sha256!==sha256||metadata.metadata?.captureId!==captureId)throw new HttpsError('failed-precondition','ไฟล์ไม่ตรงกับคำขอบันทึก');
  const result=await db.runTransaction(async tx=>{
   const app=await read(tx,true),upload=await tx.get(uploadRef);
   if(app.checkinSignature){return {ok:true,alreadyDone:true,hasSignature:true}}
   if(!upload.exists||upload.data().leaseOwner!==leaseOwner||upload.data().leaseUntil<now()||app.participantName!==expectedName)throw new HttpsError('failed-precondition','ข้อมูลเปลี่ยนหรือหมดเวลาบันทึก กรุณาตรวจบัตรใหม่');
   const change={checkinSignature:{path,generation:String(metadata.generation),sha256,at:stamp(),by:uid,signerName:app.participantName,consentVersion:CONSENT_VERSION,captureId}};
   if(!app.checkedIn)Object.assign(change,{checkedIn:true,checkedInAt:stamp(),checkedInBy:uid});
   tx.update(appRef,change);tx.create(db.collection('schoolEventAudit').doc(),{eventId,applicationId,actorUid:uid,action:'checkinSignature',path,sha256,consentVersion:CONSENT_VERSION,checkedInNow:!app.checkedIn,at:stamp()});tx.set(db.doc('schoolEventSignals/'+eventId),{changedAt:stamp()});tx.delete(uploadRef);return {ok:true,alreadyDone:false,hasSignature:true};
  });await cleanup();return result;
 }catch(error){await cleanup();throw error}
}
module.exports={signature,signatureBytes,CONSENT_VERSION};
