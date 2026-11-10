// School service announcements only. Never overwrite an existing banner collection or its history.
const assert=require('node:assert/strict'),cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=cli.getGlobalDefaultAccount(),token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 const database='projects/kusk-register/databases/(default)',base='https://firestore.googleapis.com/v1/'+database+'/documents';
 const meta=await fetch(base+'/schoolEventBannerMeta/main',{headers});if(meta.ok){console.log('Existing banner setup preserved; no changes');return}assert.equal(meta.status,404);
 const existing=await fetch(base+'/schoolEventBanners?pageSize=1',{headers});assert.ok(existing.ok);if((await existing.json()).documents?.length){console.log('Existing banners preserved; no changes');return}
 const site='https://kusk-school-events.racing-genet-6727.chatgpt.site',stamp=new Date().toISOString();
 const value=v=>typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{stringValue:v};
 const make=(path,data)=>({update:{name:database+'/documents/'+path,fields:Object.fromEntries(Object.entries(data).map(([key,v])=>[key,value(v)]))},currentDocument:{exists:false}});
 const rows=[['school-welcome','กิจกรรมและข่าวสารของโรงเรียน','welcome.svg','#live-events'],['school-my-pass','ประวัติและบัตรเข้าร่วมกิจกรรมของฉัน','my-pass.svg','#live-mine']];
 const writes=rows.map(([id,title,file,linkUrl],index)=>make('schoolEventBanners/'+id,{title,imageUrl:site+'/banners/'+file,mobileImageUrl:'',linkUrl,published:true,sortOrder:index+1,version:1,updatedBy:'school-site-setup'}));
 writes.forEach(write=>write.update.fields.updatedAt={timestampValue:stamp});writes.push(make('schoolEventBannerMeta/main',{count:2}));
 const response=await fetch(base+':commit',{method:'POST',headers,body:JSON.stringify({writes})});assert.ok(response.ok,'Cannot initialize banners; existing changes were not overwritten');
 console.log('PASS initialized two editable school-service banners; no applicant data accessed or changed');
})().catch(error=>{console.error(error.message);process.exitCode=1});
