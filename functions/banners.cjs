const SITE='https://kusk-school-events.racing-genet-6727.chatgpt.site';
exports.bannerData=(data,id,HttpsError)=>{
 const fail=message=>{throw new HttpsError('invalid-argument',message)};
 if(!data||typeof data.title!=='string'||!data.title.trim()||data.title.trim().length>160||typeof data.published!=='boolean'||!Number.isInteger(data.sortOrder)||data.sortOrder<0||data.sortOrder>9999)fail('กรุณาตรวจชื่อ สถานะ และลำดับแบนเนอร์');
 const image=value=>{
  if(typeof value!=='string'||value.length>2000)fail('ภาพแบนเนอร์ไม่ถูกต้อง');
  if([SITE+'/banners/welcome.svg',SITE+'/banners/my-pass.svg'].includes(value))return value;
  let url;try{url=new URL(value)}catch{fail('กรุณาอัปโหลดภาพแบนเนอร์')}
  const prefix='/v0/b/kusk-register.firebasestorage.app/o/';let path;try{path=decodeURIComponent(url.pathname.slice(prefix.length))}catch{fail('ภาพไม่ถูกต้อง')}
  if(url.protocol!=='https:'||url.hostname!=='firebasestorage.googleapis.com'||!url.pathname.startsWith(prefix)||!new RegExp('^schoolEventBanners/'+id+'/[A-Za-z0-9-]+[.]jpg$').test(path)||url.username||url.password||url.port)fail('ภาพต้องอยู่ในพื้นที่แบนเนอร์นี้ของโรงเรียน');
  return url.href;
 };
 let linkUrl='';
 if(data.linkUrl){if(typeof data.linkUrl!=='string'||data.linkUrl.length>1000)fail('ลิงก์ยาวเกินไป');if(/^#[A-Za-z0-9/_-]{1,150}$/.test(data.linkUrl))linkUrl=data.linkUrl;else{let url;try{url=new URL(data.linkUrl)}catch{fail('กรุณาใช้ลิงก์ https:// หรือเว้นว่าง')};if(url.protocol!=='https:'||url.username||url.password)fail('กรุณาใช้ลิงก์ https://');linkUrl=url.href}}
 return {title:data.title.trim(),imageUrl:image(data.imageUrl),mobileImageUrl:data.mobileImageUrl?image(data.mobileImageUrl):'',linkUrl,published:data.published,sortOrder:data.sortOrder};
};
exports.banners=async(request,{db,HttpsError,FieldValue})=>{
 const {action,bannerId,banner,expectedVersion}=request.data||{};
 await require('./delegation.cjs').assertSystem(request,db,'banners',HttpsError);
 if(typeof bannerId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(bannerId)||!Number.isInteger(expectedVersion)||expectedVersion<0)throw new HttpsError('invalid-argument','ข้อมูลแบนเนอร์ไม่ถูกต้อง');
 const data=action==='saveBanner'?exports.bannerData(banner,bannerId,HttpsError):null;
 const ref=db.doc('schoolEventBanners/'+bannerId),meta=db.doc('schoolEventBannerMeta/main');
 return db.runTransaction(async tx=>{
  await require('./delegation.cjs').assertSystem(request,db,'banners',HttpsError,tx);
  if(require('./session-access.cjs').approvedLineAdmin(request.auth.token)){const config=(await tx.get(db.doc('schoolEventSystem/linePilot'))).data();if(config?.enabled!==true||!(config.lineAdminUids||[]).includes(request.auth.uid))throw new HttpsError('permission-denied','สิทธิ์ Admin ผ่าน LINE สิ้นสุดแล้ว')}
  const [snapshot,countDoc]=await Promise.all([tx.get(ref),tx.get(meta)]),version=snapshot.exists?snapshot.data().version:0,count=countDoc.data()?.count||0;
  if(!snapshot.exists&&action==='deleteBanner')return {ok:true,alreadyDone:true};
  if(version!==expectedVersion)throw new HttpsError('failed-precondition','ข้อมูลแบนเนอร์เปลี่ยนแล้ว กรุณาเปิดรายการล่าสุดก่อนบันทึก');
  if(action==='saveBanner'){
   if(!snapshot.exists&&count>=20)throw new HttpsError('resource-exhausted','เพิ่มได้สูงสุด 20 แบนเนอร์ กรุณาลบรายการที่ไม่ใช้ก่อน');
   tx.set(ref,{...data,version:version+1,updatedAt:FieldValue.serverTimestamp(),updatedBy:request.auth.uid});
   if(!snapshot.exists)tx.set(meta,{count:count+1});
  }else if(action==='deleteBanner'){
   tx.delete(ref);tx.set(meta,{count:Math.max(0,count-1)});
  }else throw new HttpsError('invalid-argument','คำสั่งไม่ถูกต้อง');
  tx.create(db.collection('schoolEventAudit').doc(),{eventId:'__banners__',action,actorUid:request.auth.uid,bannerId,bannerTitle:data?.title||snapshot.data().title,at:FieldValue.serverTimestamp()});
  return {ok:true,version:version+1};
 });
};
