// Adds only the eventId collection-group index; preserves existing field indexes.
const cliAuth=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=cliAuth.getGlobalDefaultAccount();if(!account)throw new Error('Firebase login required');
 const token=await cliAuth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const url='https://firestore.googleapis.com/v1/projects/kusk-register/databases/(default)/collectionGroups/events/fields/eventId';
 const headers={Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'};
 const read=await fetch(url,{headers});if(!read.ok)throw new Error('Cannot read index: '+read.status);const field=await read.json();const indexes=field.indexConfig?.indexes||[];
 const found=indexes.find(index=>index.queryScope==='COLLECTION_GROUP'&&index.fields?.some(f=>f.fieldPath==='eventId'&&f.order==='ASCENDING'));
 if(found){console.log('Staff index exists: '+found.state);return}
 const desired=indexes.map(index=>({queryScope:index.queryScope,fields:index.fields,...(index.apiScope?{apiScope:index.apiScope}:{})}));
 desired.push({queryScope:'COLLECTION_GROUP',fields:[{fieldPath:'eventId',order:'ASCENDING'}]});
 const response=await fetch(url+'?updateMask=indexConfig',{method:'PATCH',headers,body:JSON.stringify({name:field.name,indexConfig:{indexes:desired}})});
 if(!response.ok)throw new Error('Cannot add index: '+response.status+' '+await response.text());
 const operation=await response.json();console.log('Staff index requested: '+operation.name);
})().catch(error=>{console.error(error.message);process.exitCode=1});
