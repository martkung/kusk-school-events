// Cloud evaluator: synthetic requests only, never reads or writes user records.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=cli.getGlobalDefaultAccount(),token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const normal={uid:'worker',token:{firebase:{sign_in_provider:'google.com'}}},custom={uid:'worker',token:{line_login:true,firebase:{sign_in_provider:'custom'}}};
 const cases=[
  ['delegated editor reads catalog draft','ALLOW','get','schoolEventCatalog/event',['editEvents']],
  ['delegate cannot read raw applicants','DENY','get','schoolEventApplications/app',['applicationsTrash']],
  ['delegated auditor reads history','ALLOW','get','schoolEventAudit/item',['audit']],
  ['editor cannot read private history','DENY','get','schoolEventAudit/item',['editEvents']],
  ['banner manager reads draft','ALLOW','get','schoolEventBanners/banner',['banners']],
  ['editor cannot read banner draft','DENY','get','schoolEventBanners/banner',['editEvents']],
  ['delegate reads own role','ALLOW','get','schoolEventDelegates/worker',['editEvents']],
  ['delegate cannot read another role','DENY','get','schoolEventDelegates/other',['editEvents']],
  ['delegate cannot self promote','DENY','update','schoolEventDelegates/worker',['editEvents']],
  ['delegate cannot edit catalog directly','DENY','update','schoolEventCatalog/event',['editEvents']],
  ['applicant trash receives change signal','ALLOW','get','schoolEventSignals/event',['applicationsTrash']],
  ['editor cannot read applicant signal','DENY','get','schoolEventSignals/event',['editEvents']],
  ['revoked editor cannot read draft','DENY','get','schoolEventCatalog/event',['editEvents'],false],
  ['unapproved LINE custom delegate denied','DENY','get','schoolEventCatalog/event',['editEvents'],true,custom]
 ];
 const tests=cases.map(([name,expectation,method,p,permissions,active=true,auth=normal])=>({expectation,functionMocks:[{function:'exists',args:[{anyValue:{}}],result:{value:true}},{function:'get',args:[{anyValue:{}}],result:{value:{data:{active,permissions}}}}],request:{path:'/databases/(default)/documents/'+p,method,auth,resource:{data:{admin:true}}},resource:{name:'projects/kusk-register/databases/(default)/documents/'+p,data:{published:false,ownerUid:'other'}}}));
 const storage=[
  ['delegate poster upload','ALLOW','schoolEventPosters/event/file.jpg',['posters']],
  ['banner role cannot upload poster','DENY','schoolEventPosters/event/file.jpg',['banners']],
  ['delegate banner upload','ALLOW','schoolEventBanners/banner/file.jpg',['banners']],
  ['poster role cannot upload banner','DENY','schoolEventBanners/banner/file.jpg',['posters']],
  ['delegate cannot access private signatures','DENY','schoolEventSignatures/event/app/file.png',['posters','audit','purgeEvents']],
  ['delegate cannot access legacy files','DENY','legacy/file.jpg',['posters']],
  ['revoked uploader denied','DENY','schoolEventPosters/event/file.jpg',['posters'],false],
  ['purging event blocks delegate poster','DENY','schoolEventPosters/event/file.jpg',['posters'],true,true],
  ['custom delegate cannot upload','DENY','schoolEventPosters/event/file.jpg',['posters'],true,false,custom]
 ];
 const storageTests=storage.map(([name,expectation,p,permissions,active=true,purging=false,auth=normal])=>({expectation,functionMocks:[{function:'firestore.exists',args:[{anyValue:{}}],result:{value:true}},{function:'firestore.get',args:[{anyValue:{}}],result:{value:{data:{active,permissions,purging,deleted:false}}}}],request:{path:'/b/kusk-register.firebasestorage.app/o/'+p,method:'create',auth,resource:{size:100,contentType:'image/jpeg'}},resource:{size:100,contentType:'image/jpeg'}}));
 for(const [file,examples,testCases] of [['firestore.candidate.rules',cases,tests],['storage.rules',storage,storageTests]]){
  const response=await fetch('https://firebaserules.googleapis.com/v1/projects/kusk-register:test',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({source:{files:[{name:file,content:fs.readFileSync(path.join(__dirname,file),'utf8')}]},testSuite:{testCases}})});
  const data=await response.json();if(!response.ok)throw Error(JSON.stringify(data.error));assert.equal(data.testResults?.length,examples.length,JSON.stringify(data.issues));data.testResults.forEach((r,i)=>assert.equal(r.state,'SUCCESS',examples[i][0]+': '+JSON.stringify(r.debugMessages)));console.log(file+': '+examples.length+' synthetic cases passed');
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
