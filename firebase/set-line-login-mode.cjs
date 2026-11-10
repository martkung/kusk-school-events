// User explicitly approved the existing linked LINE for the named Google Admin.
const assert=require('node:assert/strict');const cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const project='kusk-register',account=cli.getGlobalDefaultAccount(),token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 async function call(url,method='GET',body){const r=await fetch(url,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const value=await r.json().catch(()=>({}));if(!r.ok)throw Error('Configuration failed '+r.status);return value}
 const users=(await call(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,'POST',{email:['icontrol.kung@gmail.com']})).users;
 assert.equal(users?.length,1);const user=users[0];assert.ok(user.emailVerified&&!user.disabled&&user.providerUserInfo?.some(p=>p.providerId==='google.com'));assert.equal(JSON.parse(user.customAttributes||'{}').admin,true);
 const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/`;
 const linkResponse=await fetch(base+'schoolEventLineLinks/'+user.localId,{headers});let linked=false;
 if(linkResponse.ok){const link=await linkResponse.json(),identity=link.fields?.identity?.stringValue;assert.match(identity||'',/^[0-9a-f]{64}$/);const reverse=await call(base+'schoolEventLineIdentities/'+identity);assert.equal(reverse.fields.ownerUid.stringValue,user.localId);assert.equal(reverse.fields.channelId.stringValue,'2012417122');linked=true}else assert.equal(linkResponse.status,404);
 const url=base+'schoolEventSystem/linePilot',config=await call(url);assert.equal(config.fields.enabled.booleanValue,true);assert.ok(config.fields.allowedUids.arrayValue.values.some(v=>v.stringValue===user.localId));
 const fields={allowNewAccounts:{booleanValue:true},maxNewAccounts:{integerValue:'20'},lineAdminUids:{arrayValue:{values:[{stringValue:user.localId}]}}};
 if(!config.fields.newAccountCount)fields.newAccountCount={integerValue:'0'};
 const query=new URLSearchParams();Object.keys(fields).forEach(key=>query.append('updateMask.fieldPaths',key));query.set('currentDocument.updateTime',config.updateTime);
 await call(url+'?'+query,'PATCH',{fields});
 const verify=await call(url);assert.equal(verify.fields.allowNewAccounts.booleanValue,true);assert.deepEqual(verify.fields.lineAdminUids.arrayValue.values.map(v=>v.stringValue),[user.localId]);
 console.log('PASS named school Admin UID approved for LINE; direct applicant pilot limited to 20 new identities; Google claims unchanged; Admin LINE link '+(linked?'verified':'requires one-time Google confirmation'));
})().catch(error=>{console.error(error.message);process.exitCode=1});
