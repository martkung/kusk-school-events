// Read-only audit using the existing Firebase CLI login. Never print tokens.
const fs=require('node:fs'),path=require('node:path');
const auth=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=auth.getGlobalDefaultAccount();if(!account)throw new Error('Firebase CLI login required');
 const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 async function get(url){const response=await fetch(url,{headers:{Authorization:`Bearer ${token.access_token}`}});if(!response.ok)throw new Error(`Read failed: ${response.status}`);return response.json()}
 const release=await get('https://firebaserules.googleapis.com/v1/projects/kusk-register/releases/cloud.firestore');
 const rules=await get(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
 const dir=path.join(__dirname,'audit');fs.mkdirSync(dir,{recursive:true});
 for(const file of rules.source.files)fs.writeFileSync(path.join(dir,path.basename(file.name)),file.content);
 console.log('Live Firestore rules backed up locally. No changes made.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
