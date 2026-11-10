// Same-project metrics/incidents only. No notification channels or applicant data.
const cli=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
const project='kusk-register',metric='school_event_system_failures',displayName='KUSK Events — system failures';
const filter='resource.type="cloud_run_revision" AND severity>=ERROR AND jsonPayload.tag="kusk_school_events" AND jsonPayload.message="school_event_system_failure"';
(async()=>{
 const account=cli.getGlobalDefaultAccount(),token=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 async function call(url,method='GET',body){const r=await fetch(url,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const value=await r.json().catch(()=>({}));if(!r.ok)throw Error(r.status+' '+(value.error?.message||'Request failed'));return value}
 const metricUrl=`https://logging.googleapis.com/v2/projects/${project}/metrics/${metric}`;
 const existing=await fetch(metricUrl,{headers});if(existing.status===404){await call(`https://logging.googleapis.com/v2/projects/${project}/metrics`,'POST',{name:metric,description:'Counts sanitized KUSK Events server system failures; excludes expected user errors.',filter,metricDescriptor:{metricKind:'DELTA',valueType:'INT64',unit:'1',displayName:'KUSK Events system failures'}});console.log('Created system-failure counter')}
 else{if(!existing.ok)throw Error('Metric verification failed: '+existing.status);if((await existing.json()).filter!==filter)throw Error('Existing metric has unexpected filter');console.log('System-failure counter verified')}
 const policiesUrl=`https://monitoring.googleapis.com/v3/projects/${project}/alertPolicies`,policies=await call(policiesUrl);
 let policy=policies.alertPolicies?.find(p=>p.displayName===displayName);
 if(!policy){policy=await call(policiesUrl,'POST',{displayName,combiner:'OR',enabled:true,notificationChannels:[],documentation:{mimeType:'text/markdown',content:'An unexpected KUSK Events server error was recorded. Inspect sanitized Cloud Logging entries tagged kusk_school_events. Application logs do not include applicant identities, contact details, QR codes, input payloads or raw exception messages. No external notification channels are configured.'},conditions:[{displayName:'At least one unexpected server failure',conditionThreshold:{filter:`metric.type="logging.googleapis.com/user/${metric}" AND resource.type="cloud_run_revision"`,comparison:'COMPARISON_GT',thresholdValue:0,duration:'0s',trigger:{count:1},aggregations:[{alignmentPeriod:'60s',perSeriesAligner:'ALIGN_DELTA',crossSeriesReducer:'REDUCE_SUM'}]}}],alertStrategy:{autoClose:'1800s'}});console.log('Created same-project incident policy')}
 if(!policy.enabled||(policy.notificationChannels||[]).length)throw Error('Policy verification failed: expected enabled with no external channels');
 if(!policy.conditions.some(condition=>condition.displayName==='HTTP 5xx from school-event services')){
  const services=[];for(const fn of ['schoolEventEnroll','schoolEventOperate']){const value=await call(`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/asia-southeast1/functions/${fn}`);services.push(value.serviceConfig.service.split('/').at(-1))}
  const serviceFilter=services.map(name=>`resource.labels.service_name="${name}"`).join(' OR ');
  const condition={displayName:'HTTP 5xx from school-event services',conditionThreshold:{filter:`metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx" AND resource.type="cloud_run_revision" AND (${serviceFilter})`,comparison:'COMPARISON_GT',thresholdValue:0,duration:'0s',trigger:{count:1},aggregations:[{alignmentPeriod:'60s',perSeriesAligner:'ALIGN_DELTA',crossSeriesReducer:'REDUCE_SUM'}]}};
  policy=await call('https://monitoring.googleapis.com/v3/'+policy.name+'?updateMask=conditions','PATCH',{name:policy.name,conditions:[...policy.conditions,condition]});console.log('Added service HTTP-5xx condition')
 }
 console.log('PASS monitoring configured; no external notification channels; no applicant records read or copied');
})().catch(error=>{console.error(error.message);process.exitCode=1});
