const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const auth=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=auth.getGlobalDefaultAccount();
 const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 async function get(url){const r=await fetch(url,{headers:{Authorization:`Bearer ${token.access_token}`}});if(!r.ok)throw new Error(`Read failed: ${r.status}`);return r.json()}
 const release=await get('https://firebaserules.googleapis.com/v1/projects/kusk-register/releases/cloud.firestore');
 const rules=await get(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
 assert.equal(rules.source.files[0].content.replace(/\r/g,''),fs.readFileSync(path.join(__dirname,'firestore.candidate.rules'),'utf8').replace(/\r/g,''));
 for(const collection of ['registrations','schoolEventApplications','schoolEventSignals','admins','schoolEventAccounts/test/participants']){
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/kusk-register/databases/(default)/documents/${collection}?pageSize=1`);
  assert.equal(response.status,403,`Anonymous access must be denied: ${collection}`);
  console.log(`PASS anonymous denied: ${collection}`);
 }
 console.log('PASS deployed rules match local candidate');
})().catch(e=>{console.error(e.message);process.exitCode=1});
