// Read-only smoke checks. No real LINE token, link or applicant mutation.
const assert=require('node:assert/strict');
(async()=>{
 const base='https://asia-southeast1-kusk-register.cloudfunctions.net/';
 async function call(name,data){const r=await fetch(base+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});return {status:r.status,data:await r.json()}}
 const status=await call('schoolEventLinePilot',{action:'status'});assert.equal(status.status,200);assert.deepEqual(status.data.result,{enabled:true,channelId:'2012417122',liffId:'2012417122-9huGTgkq',eligible:false,linked:false,google:false,fresh:false,directLogin:true});
 const login=await call('schoolEventLinePilot',{action:'login'});assert.equal(login.status,400);assert.equal(login.data.error.status,'INVALID_ARGUMENT');
 const rejected=await call('schoolEventLinePilot',{action:'login',idToken:'synthetic-invalid-token-'.repeat(8)});assert.equal(rejected.status,403);assert.equal(rejected.data.error.details?.reason,'LINE_REAUTH_REQUIRED');
 const link=await call('schoolEventLinePilot',{action:'link'});assert.equal(link.status,403);assert.equal(link.data.error.status,'PERMISSION_DENIED');
 const admin=await call('schoolEventOperate',{action:'health'});assert.equal(admin.status,401);assert.equal(admin.data.error.status,'UNAUTHENTICATED');
 console.log('PASS live pilot status exposes no identities; missing LINE token, unauthenticated linking and backoffice access rejected; no user data changed');
})().catch(error=>{console.error(error.message);process.exitCode=1});
