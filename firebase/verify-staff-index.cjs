// Read-only: verifies index readiness and executes the exact event-scoped query.
const cliAuth=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=cliAuth.getGlobalDefaultAccount(),token=await cliAuth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const headers={Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},base='https://firestore.googleapis.com/v1/projects/kusk-register/databases/(default)';
 const fieldResponse=await fetch(base+'/collectionGroups/events/fields/eventId',{headers});if(!fieldResponse.ok)throw new Error('Index read failed: '+fieldResponse.status);const field=await fieldResponse.json();
 const index=field.indexConfig?.indexes?.find(i=>i.queryScope==='COLLECTION_GROUP'&&i.fields.some(f=>f.fieldPath==='eventId'&&f.order==='ASCENDING'));if(index?.state!=='READY')throw new Error('Staff index is not ready: '+index?.state);
 const response=await fetch(base+'/documents:runQuery',{method:'POST',headers,body:JSON.stringify({structuredQuery:{from:[{collectionId:'events',allDescendants:true}],where:{fieldFilter:{field:{fieldPath:'eventId'},op:'EQUAL',value:{stringValue:'school-system-test-20261105'}}},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:1}})});
 if(!response.ok)throw new Error('Scoped query failed: '+response.status+' '+await response.text());
 await response.json();console.log('PASS staff index READY and event-scoped query accepted. No data changed.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
