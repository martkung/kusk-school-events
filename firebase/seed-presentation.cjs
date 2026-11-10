// Explicitly requested presentation fixtures. Create-only and safe to rerun:
// never reset an existing event, its seats, applications, or a changed banner.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const data=require('./presentation-data.json');
const cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
const database='projects/kusk-register/databases/(default)',base='https://firestore.googleapis.com/v1/'+database+'/documents',bucket='kusk-register.firebasestorage.app';
const marker='school-presentation-setup';
const imageURL=(folder,id)=>'https://firebasestorage.googleapis.com/v0/b/'+bucket+'/o/'+encodeURIComponent(folder+'/'+id+'/presentation-20261107.jpg')+'?alt=media';
const field=value=>typeof value==='boolean'?{booleanValue:value}:typeof value==='number'?{integerValue:String(value)}:{stringValue:value};
const create=(collection,id,record,timestamp)=>({update:{name:database+'/documents/'+collection+'/'+id,fields:Object.fromEntries(Object.entries(record).map(([key,value])=>[key,field(value)]))},currentDocument:{exists:false},updateTransforms:[{fieldPath:timestamp,setToServerValue:'REQUEST_TIME'}]});
(async()=>{
 assert.equal(data.events.length,5);assert.equal(data.banners.length,5);
 const account=cli.getGlobalDefaultAccount();assert.ok(account,'Firebase login required');const token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 async function get(url){const response=await fetch(url,{headers});if(response.status===404)return null;assert.ok(response.ok,'Read failed: '+response.status);return response.json()}
 const targets=[...data.events.map(row=>['schoolEventCatalog',row]),...data.banners.map(row=>['schoolEventBanners',row])];
 const existing=await Promise.all(targets.map(([collection,row])=>get(base+'/'+collection+'/'+row.id)));
 if(existing.every(doc=>doc?.fields?.demoBatch?.stringValue===data.batch)){console.log('All 10 presentation records already exist; preserved without changes');return}
 assert.ok(existing.every(doc=>doc===null),'Some target IDs already exist; refusing to overwrite any records');
 for(const event of data.events){assert.equal(await get(base+'/schoolEventTombstones/'+event.id),null,'Previously purged event ID cannot be reused')}
 const list=await get(base+'/schoolEventBanners?pageSize=100'),banners=list?.documents||[];assert.ok(!list?.nextPageToken,'Unexpected banner pagination');assert.ok(banners.length+5<=20,'Not enough banner slots');
 const meta=await get(base+'/schoolEventBannerMeta/main');assert.ok(!meta||Number(meta.fields?.count?.integerValue)===banners.length,'Banner counter changed or needs review');
 const maxOrder=Math.max(0,...banners.map(doc=>Number(doc.fields?.sortOrder?.integerValue||0)));assert.ok(maxOrder+5<=9999);
 const assets=targets.map(([collection,row])=>({folder:collection==='schoolEventCatalog'?'schoolEventPosters':'schoolEventBanners',row,file:path.join(__dirname,'../presentation-assets/2026-11-07/web',row.asset+'.jpg')}));
 for(const asset of assets){const bytes=fs.readFileSync(asset.file);assert.ok(bytes.length>10000&&bytes.length<=2*1024*1024,'Image size invalid');assert.equal(bytes.readUInt16BE(0),0xffd8,'JPEG required')}
 console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'preview',newEvents:5,newBanners:5,existingBanners:banners.length,applicantsTouched:0}));
 if(!process.argv.includes('--apply'))return;
 // Upload only the dedicated fixture objects. Existing objects must match exactly.
 for(const {folder,row,file} of assets){const bytes=fs.readFileSync(file),name=folder+'/'+row.id+'/presentation-20261107.jpg',md5=createHash('md5').update(bytes).digest('base64');const response=await fetch('https://storage.googleapis.com/upload/storage/v1/b/'+bucket+'/o?uploadType=media&ifGenerationMatch=0&name='+encodeURIComponent(name),{method:'POST',headers:{Authorization:headers.Authorization,'Content-Type':'image/jpeg'},body:bytes});if(response.status===412){const object=await get('https://storage.googleapis.com/storage/v1/b/'+bucket+'/o/'+encodeURIComponent(name));assert.equal(object?.md5Hash,md5,'Existing fixture image differs; refusing overwrite')}else assert.ok(response.ok,'Upload failed: '+response.status);}
 const writes=[];
 for(const row of data.events){writes.push(create('schoolEventCatalog',row.id,{name:row.name,date:row.date,place:row.place,description:'[กิจกรรมจำลองสำหรับนำเสนอระบบ ไม่มีการจัดงานจริงและไม่มีค่าใช้จ่าย]\n'+row.description+'\n\nใช้สาธิตการสมัคร อนุมัติ บัตร QR เช็คอิน ลายเซ็น และรายงาน การกดสมัครจะบันทึกใบสมัครจริงในกิจกรรมจำลองนี้ กรุณาให้ผู้ทดสอบใช้บัญชีของตนเอง',capacity:row.capacity,reservedCount:0,published:true,registrationOpen:true,checkinOpen:true,isTest:true,demoBatch:data.batch,posterUrl:imageURL('schoolEventPosters',row.id),createdBy:marker},'createdAt'));writes.push(create('schoolEventAudit','demo-create-'+row.id,{eventId:row.id,actorUid:marker,action:'createDemoEvent',demoBatch:data.batch},'at'));}
 for(const [index,row] of data.banners.entries()){const banner={title:row.title,imageUrl:imageURL('schoolEventBanners',row.id),mobileImageUrl:'',linkUrl:row.linkUrl,published:true,sortOrder:maxOrder+index+1};require('../functions/banners.cjs').bannerData(banner,row.id,class extends Error{});writes.push(create('schoolEventBanners',row.id,{...banner,version:1,isTest:true,demoBatch:data.batch,updatedBy:marker},'updatedAt'));writes.push(create('schoolEventAudit','demo-create-'+row.id,{eventId:'__banners__',actorUid:marker,action:'createDemoBanner',bannerId:row.id,demoBatch:data.batch},'at'));}
 writes.push({update:{name:database+'/documents/schoolEventBannerMeta/main',fields:{count:{integerValue:String(banners.length+5)}}},...(meta?{updateMask:{fieldPaths:['count']},currentDocument:{updateTime:meta.updateTime}}:{currentDocument:{exists:false}})});
 const response=await fetch(base+':commit',{method:'POST',headers,body:JSON.stringify({writes})});assert.ok(response.ok,'Atomic create failed: '+response.status+'; existing documents were not overwritten');
 for(const [collection,row] of targets){const doc=await get(base+'/'+collection+'/'+row.id);assert.equal(doc?.fields?.demoBatch?.stringValue,data.batch);const url=doc.fields.posterUrl?.stringValue||doc.fields.imageUrl?.stringValue;const image=await fetch(url);assert.ok(image.ok,'Public image unavailable: '+row.asset);const bytes=Buffer.from(await image.arrayBuffer());assert.equal(bytes.readUInt16BE(0),0xffd8);console.log('PASS created and verified '+row.id);}
 console.log('PASS created 5 events + 5 banners with 10 images and setup audit records; existing data preserved');
})().catch(error=>{console.error(error.message);process.exitCode=1});
