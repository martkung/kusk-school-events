// Explicit user authorization: only this named Google account, preserve claims.
const auth=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const email='icontrol.kung@gmail.com',account=auth.getGlobalDefaultAccount();
 const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const base='https://identitytoolkit.googleapis.com/v1/projects/kusk-register/accounts:';
 async function post(method,data){const r=await fetch(base+method,{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw new Error(`Account operation failed: ${r.status}`);return r.json()}
 const users=(await post('lookup',{email:[email]})).users;
 if(users?.length!==1||users[0].email?.toLowerCase()!==email||users[0].disabled||!users[0].providerUserInfo?.some(p=>p.providerId==='google.com'))throw new Error('Expected enabled Google account not found');
 const user=users[0],previous=JSON.parse(user.customAttributes||'{}');
 await post('update',{localId:user.localId,customAttributes:JSON.stringify({...previous,admin:true})});
 const verify=(await post('lookup',{localId:[user.localId]})).users?.[0];
 if(JSON.parse(verify?.customAttributes||'{}').admin!==true)throw new Error('Admin verification failed');
 console.log(JSON.stringify({email,admin:true,existingClaimsPreserved:Object.keys(previous).every(k=>JSON.parse(verify.customAttributes)[k]!==undefined)}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
