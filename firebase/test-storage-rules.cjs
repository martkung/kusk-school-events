// Cloud Rules evaluator with synthetic requests/resources only: no file operations.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=cli.getGlobalDefaultAccount(),token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const auth={uid:'synthetic-applicant',token:{}},admin={uid:'synthetic-admin',token:{admin:true}},base='/b/kusk-register.firebasestorage.app/o/';
 const examples=[
  ['anonymous signature read','DENY','get','schoolEventSignatures/event/app/sign.png',null],
  ['Admin signature read must use authorized server','DENY','get','schoolEventSignatures/event/app/sign.png',admin],
  ['Admin cannot overwrite signature directly','DENY','create','schoolEventSignatures/event/app/sign.png',admin],
  ['ordinary legacy read','DENY','get','legacy/example.jpg',auth],
  ['public banner image read','ALLOW','get','schoolEventBanners/banner/image.jpg',null],
  ['applicant cannot upload banner','DENY','create','schoolEventBanners/banner/image.jpg',auth],
  ['admin uploads banner','ALLOW','create','schoolEventBanners/banner/image.jpg',admin],
  ['banner cannot bypass size limit','DENY','create','schoolEventBanners/banner/image.jpg',admin,{size:3*1024*1024,contentType:'image/jpeg'}],
  ['banner cannot bypass MIME restriction','DENY','create','schoolEventBanners/banner/image.jpg',admin,{size:100,contentType:'image/svg+xml'}],
  ['LINE Admin cannot read legacy','DENY','get','legacy/example.jpg',{uid:'synthetic-admin',token:{admin:true,line_login:true,firebase:{sign_in_provider:'custom'}}}],
  ['approved LINE Admin uploads poster','ALLOW','create','schoolEventPosters/event/example.jpg',{uid:'synthetic-admin',token:{admin:true,line_login:true,line_admin:true,firebase:{sign_in_provider:'custom'}}}],
  ['LINE applicant marker cannot upload poster','DENY','create','schoolEventPosters/event/example.jpg',{uid:'synthetic-applicant',token:{line_login:true,line_admin:true,firebase:{sign_in_provider:'custom'}}}],
  ['custom Admin cannot upload poster','DENY','create','schoolEventPosters/event/example.jpg',{uid:'synthetic-admin',token:{admin:true,firebase:{sign_in_provider:'custom'}}}],
  ['ordinary legacy create','DENY','create','legacy/example.jpg',auth],
  ['ordinary legacy delete','DENY','delete','legacy/example.jpg',auth],
  ['anonymous legacy read','DENY','get','legacy/example.jpg',null],
  ['admin legacy read','ALLOW','get','legacy/example.jpg',admin],
  ['admin legacy create','ALLOW','create','legacy/example.jpg',admin],
  ['public poster read','ALLOW','get','schoolEventPosters/event/example.jpg',null],
  ['ordinary poster create','DENY','create','schoolEventPosters/event/example.jpg',auth],
  ['purge lock blocks poster upload','DENY','create','schoolEventPosters/event/example.jpg',admin,undefined,true],
  ['admin poster create','ALLOW','create','schoolEventPosters/event/example.jpg',admin],
  ['oversized poster','DENY','create','schoolEventPosters/event/example.jpg',admin,{size:3*1024*1024,contentType:'image/jpeg'}],
  ['wrong poster MIME','DENY','create','schoolEventPosters/event/example.jpg',admin,{size:100,contentType:'text/html'}],
  ['wrong poster filename','DENY','create','schoolEventPosters/event/example.html',admin]
 ];
 examples.push(['revoked LINE Admin poster upload denied','DENY','create','schoolEventPosters/event/example.jpg',{uid:'synthetic-admin',token:{admin:true,line_login:true,line_admin:true,firebase:{sign_in_provider:'custom'}}},undefined,false,true]);
 examples.push(['missing event blocks poster upload','DENY','create','schoolEventPosters/event/example.jpg',admin,undefined,false,false,true]);
 const testCases=examples.map(([name,expectation,method,file,auth,metadata,locked,revoked,missing])=>({functionMocks:[{function:'firestore.get',args:[{anyValue:{}}],result:missing?{undefined:{}}:{value:{data:{enabled:true,lineAdminUids:revoked?[]:['synthetic-admin'],deleted:locked===true,purging:locked===true}}}}],expectation,request:{path:base+file,method,auth,resource:metadata||{size:100,contentType:'image/jpeg'}},resource:{size:100,contentType:'image/jpeg'}}));
 const response=await fetch('https://firebaserules.googleapis.com/v1/projects/kusk-register:test',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({source:{files:[{name:'storage.rules',content:fs.readFileSync(path.join(__dirname,'storage.rules'),'utf8')}]},testSuite:{testCases}})});
 const result=await response.json();if(!response.ok)throw Error('Rules evaluation failed: '+response.status+' '+JSON.stringify(result.error));
 assert.equal(result.testResults?.length,examples.length,JSON.stringify(result.issues||[]));result.testResults.forEach((test,index)=>{assert.equal(test.state,'SUCCESS',examples[index][0]+': '+JSON.stringify(test.debugMessages||[]));console.log('PASS '+examples[index][0])});
})().catch(error=>{console.error(error.message);process.exitCode=1});

