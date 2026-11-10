// User authorized normal login after testing Google and LINE. Only change mode, not roles or identities.
const assert=require('node:assert/strict'),cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=cli.getGlobalDefaultAccount(),token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},url='https://firestore.googleapis.com/v1/projects/kusk-register/databases/(default)/documents/schoolEventSystem/linePilot';
 const before=await fetch(url,{headers});assert.ok(before.ok,'Cannot read login configuration');const original=await before.json();assert.equal(original.fields.enabled.booleanValue,true);assert.equal(original.fields.allowNewAccounts.booleanValue,true);
 const query=new URLSearchParams({'updateMask.fieldPaths':'mode','currentDocument.updateTime':original.updateTime});
 const response=await fetch(url+'?'+query,{method:'PATCH',headers,body:JSON.stringify({fields:{mode:{stringValue:'production'}}})});assert.ok(response.ok,'Cannot activate login mode');
 const verified=await (await fetch(url,{headers})).json();assert.equal(verified.fields.mode.stringValue,'production');
 for(const key of Object.keys(original.fields).filter(k=>k!=='mode'))assert.deepEqual(verified.fields[key],original.fields[key],key+' must remain unchanged');
 console.log('PASS normal login mode enabled; 20-account trial cap removed; existing identities and admin approvals unchanged');
})().catch(error=>{console.error(error.message);process.exitCode=1});
