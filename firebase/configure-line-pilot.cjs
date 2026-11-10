// Enable only the explicitly named first tester. Never change user claims or create users.
const assert=require('node:assert/strict');
const cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const project='kusk-register',email='icontrol.kung@gmail.com',account=cli.getGlobalDefaultAccount();
 const token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 async function call(url,method='GET',body){const response=await fetch(url,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error('Pilot configuration failed '+response.status+' '+(data.error?.message||''));return data}
 const users=(await call(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,'POST',{email:[email]})).users;
 assert.equal(users?.length,1);const user=users[0];assert.equal(user.email?.toLowerCase(),email);assert.ok(user.emailVerified&&!user.disabled&&user.providerUserInfo?.some(p=>p.providerId==='google.com'));
 const fn=await call(`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/asia-southeast1/functions/schoolEventLinePilot`);
 assert.equal(fn.state,'ACTIVE');const sa=fn.serviceConfig?.serviceAccountEmail;assert.ok(sa?.endsWith('.gserviceaccount.com'));
 // Grant only signBlob on its own service account, rather than project-wide Token Creator.
 const service=await call(`https://serviceusage.googleapis.com/v1/projects/${project}/services/iamcredentials.googleapis.com`);
 if(service.state!=='ENABLED')await call(`https://serviceusage.googleapis.com/v1/projects/${project}/services/iamcredentials.googleapis.com:enable`,'POST',{});
 const role=`projects/${project}/roles/schoolEventLineSigner`,roleUrl='https://iam.googleapis.com/v1/'+role;
 const existing=await fetch(roleUrl,{headers});let roleData;
 if(existing.status===404)roleData=await call(`https://iam.googleapis.com/v1/projects/${project}/roles`,'POST',{roleId:'schoolEventLineSigner',role:{title:'School event LINE token signer',description:'Signs Firebase custom login tokens on the runtime service account itself only.',includedPermissions:['iam.serviceAccounts.signBlob'],stage:'GA'}});
 else{if(!existing.ok)throw Error('Cannot verify signer role');roleData=await existing.json()}
 assert.deepEqual(roleData.includedPermissions,['iam.serviceAccounts.signBlob']);assert.ok(!roleData.deleted);
 const resource=`https://iam.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(sa)}`;
 const policy=await call(resource+':getIamPolicy','POST',{}),member='serviceAccount:'+sa;
 if(!policy.bindings?.some(b=>b.role===role&&b.members?.includes(member)&&!b.condition)){
  policy.bindings??=[];policy.bindings.push({role,members:[member]});await call(resource+':setIamPolicy','POST',{policy});
 }
 const verified=await call(resource+':getIamPolicy','POST',{});assert.ok(verified.bindings?.some(b=>b.role===role&&b.members?.includes(member)&&!b.condition));
 const configUrl=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/schoolEventSystem/linePilot`;
 const current=await fetch(configUrl,{headers});
 if(current.ok){const d=await current.json();assert.deepEqual(d.fields.allowedUids.arrayValue.values.map(v=>v.stringValue),[user.localId]);assert.equal(d.fields.enabled.booleanValue,true)}
 else{assert.equal(current.status,404);await call(configUrl+'?currentDocument.exists=false','PATCH',{fields:{enabled:{booleanValue:true},allowedUids:{arrayValue:{values:[{stringValue:user.localId}]}}}})}
 console.log('PASS LINE pilot enabled for the named first tester only; Google claims unchanged; signer scoped to its own runtime account');
})().catch(error=>{console.error(error.message);process.exitCode=1});
