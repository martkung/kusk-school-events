// Administrative disaster-recovery workflow. Never imports into (default).
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
const {backupSchedulePlan}=require('./backup-policy.cjs');
const project='kusk-register',base=`https://firestore.googleapis.com/v1/projects/${project}/databases`,source=base+'/(default)',bucket=project+'-school-events-backups';
const groups=['schoolEventCatalog','schoolEventApplications','schoolEventProfiles','events','schoolEventAudit','schoolEventSignals'];
const file=path.join(__dirname,'audit','backup-maintenance.json');
(async()=>{
 const account=cli.getGlobalDefaultAccount();if(!account)throw Error('Firebase login required');
 const token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 async function api(url,method='GET',body){const r=await fetch(url,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(method+' '+url.replace(/^https:\/\//,'')+': '+r.status+' '+(data.error?.message||''));return data}
 async function finish(operation){if(!operation.name)return operation;while(!operation.done){await new Promise(r=>setTimeout(r,5000));operation=await api('https://firestore.googleapis.com/v1/'+operation.name)}if(operation.error)throw Error(operation.error.message);return operation.response||{}}
 const state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};const save=()=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(state,null,2))};
 const database=await api(source),schedules=await api(source+'/backupSchedules');
 for(const change of backupSchedulePlan(schedules.backupSchedules||[])){
  await api('https://firestore.googleapis.com/v1/'+change.name+(change.method==='PATCH'?'?updateMask=retention':''),change.method,change.body);console.log('Applied backup schedule policy: '+change.method);
 }
 const verified=await api(source+'/backupSchedules');const daily=verified.backupSchedules?.find(s=>Object.hasOwn(s,'dailyRecurrence'));
 if(daily?.retention!=='604800s'||verified.backupSchedules.some(s=>Object.hasOwn(s,'weeklyRecurrence')))throw Error('Daily-only backup policy verification failed');
 state.dailyRecurrence=daily.name;delete state.weeklyRecurrence;save();console.log('PASS daily backup retained 7 days; weekly schedule disabled; existing backup files not deleted');
 // Export requires a separate, explicit action; normal maintenance never copies records.
 if((!process.argv.includes('--export-restore')&&!process.argv.includes('--export'))||process.argv.includes('--schedule-only'))return;
 let storage;const response=await fetch('https://storage.googleapis.com/storage/v1/b/'+bucket,{headers});
 if(response.status===404){storage=await api('https://storage.googleapis.com/storage/v1/b?project='+project,'POST',{name:bucket,location:database.locationId,storageClass:'STANDARD',iamConfiguration:{uniformBucketLevelAccess:{enabled:true},publicAccessPrevention:'enforced'},lifecycle:{rule:[{action:{type:'Delete'},condition:{age:14}}]}});console.log('Created private backup bucket')}
 else{if(!response.ok)throw Error('Backup bucket cannot be verified: '+response.status);storage=await response.json();if(String(storage.projectNumber)!=='364604187830'||storage.iamConfiguration?.publicAccessPrevention!=='enforced')throw Error('Unexpected backup bucket ownership or privacy')}
 if(!state.export){state.export={uri:'gs://'+bucket+'/restore-drill-'+new Date().toISOString().replace(/[:.]/g,'-')};save()}
 if(!state.export.operation&&!state.export.done){const operation=await api(source+':exportDocuments','POST',{outputUriPrefix:state.export.uri,collectionIds:groups});state.export.operation=operation.name;save()}
 if(!state.export.done){console.log('Waiting for managed export');const result=await finish({name:state.export.operation});state.export.uri=result.outputUriPrefix||state.export.uri;state.export.done=true;save();console.log('Managed export completed')}
 if(!process.argv.includes('--export-restore')){console.log('Export-only operation; no restore-test database created');return}
 if(state.drill?.verified&&state.drill.cleaned){console.log('Restore drill already verified: '+state.drill.verifiedAt);return}
 if(state.drill?.verified&&!state.drill.cleaned){if(!/^school-restore-check-[a-f0-9]{8}$/.test(state.drill.id)||!state.drill.owned)throw Error('Unsafe cleanup destination');await finish(await api(base+'/'+state.drill.id,'DELETE'));state.drill.cleaned=true;save();console.log('Completed scratch-database cleanup');return}
 if(!state.drill){const id='school-restore-check-'+randomUUID().slice(0,8);state.drill={id,owned:true};save();const operation=await api(base+'?databaseId='+id,'POST',{locationId:database.locationId,type:'FIRESTORE_NATIVE',deleteProtectionState:'DELETE_PROTECTION_DISABLED'});state.drill.createOperation=operation.name;save()}
 const target=base+'/'+state.drill.id;if(!/^school-restore-check-[a-f0-9]{8}$/.test(state.drill.id)||!state.drill.owned)throw Error('Unsafe restore destination');
 if(!state.drill.createOperation)throw Error('Database creation was interrupted; inspect the recorded scratch database before retrying');
 await finish({name:state.drill.createOperation});
 const anonymous=await fetch(target+'/documents/schoolEventApplications?pageSize=1');if(anonymous.status!==403)throw Error('Restore database must deny anonymous access before import');
 if(!state.drill.importOperation){const operation=await api(target+':importDocuments','POST',{inputUriPrefix:state.export.uri,collectionIds:groups});state.drill.importOperation=operation.name;save()}
 console.log('Waiting for restore into isolated database');await finish({name:state.drill.importOperation});
 const counts={};for(const collectionId of groups){const result=await api(target+'/documents:runAggregationQuery','POST',{structuredAggregationQuery:{structuredQuery:{from:[{collectionId,allDescendants:true}]},aggregations:[{alias:'count',count:{}}]}});counts[collectionId]=Number(result[0]?.result?.aggregateFields?.count?.integerValue||0)}
 if(!counts.schoolEventCatalog)throw Error('Restored catalog is unexpectedly empty');
 state.drill.verified=true;state.drill.verifiedAt=new Date().toISOString();state.drill.counts=counts;save();console.log('Restore verified; restored collection counts: '+JSON.stringify(counts));
 // Delete only the uniquely-created scratch database, never production.
 await finish(await api(target,'DELETE'));state.drill.cleaned=true;save();console.log('Removed isolated restore-test database; production unchanged');
})().catch(error=>{console.error(error.message);process.exitCode=1});
