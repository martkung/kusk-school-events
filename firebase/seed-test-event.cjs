// Explicitly requested test event. Create-only: reruns never reset seat counts.
const auth=require('C:/Users/Martkung/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');
(async()=>{
 const account=auth.getGlobalDefaultAccount();if(!account)throw new Error('Firebase login required');
 const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const base='https://firestore.googleapis.com/v1/projects/kusk-register/databases/(default)/documents';
 const id='school-system-test-20261105';
 const fields={
  name:{stringValue:'กิจกรรมทดสอบระบบสมัคร KUSK (สำหรับทดลองเท่านั้น)'},
  date:{stringValue:'กิจกรรมจำลอง ไม่มีการจัดงานจริง'},
  place:{stringValue:'ทดลองผ่านเว็บไซต์'},
  description:{stringValue:'ใช้ทดสอบการเลือกผู้เข้าร่วม ส่งใบสมัคร และดูสถานะย้อนหลังเท่านั้น ไม่มีการจัดงานหรือค่าใช้จ่าย การสมัครจะบันทึกจริงในระบบด้วยสถานะรอพิจารณา กรุณาใช้ข้อมูลผู้เข้าร่วมสมมติสำหรับทดสอบ'},
  published:{booleanValue:true},registrationOpen:{booleanValue:true},
  capacity:{integerValue:'20'},reservedCount:{integerValue:'0'},isTest:{booleanValue:true},
  createdAt:{timestampValue:new Date().toISOString()}
 };
 const headers={Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'};
 const response=await fetch(`${base}/schoolEventCatalog?documentId=${id}`,{method:'POST',headers,body:JSON.stringify({fields})});
 if(!response.ok&&response.status!==409)throw new Error(`Create failed: ${response.status}`);
 const verify=await fetch(`${base}/schoolEventCatalog/${id}`,{headers});if(!verify.ok)throw new Error(`Verify failed: ${verify.status}`);
 const doc=await verify.json();
 console.log(JSON.stringify({created:response.status!==409,id,name:doc.fields.name.stringValue,capacity:doc.fields.capacity.integerValue,reservedCount:doc.fields.reservedCount.integerValue,published:doc.fields.published.booleanValue}));
})().catch(error=>{console.error(error.message);process.exitCode=1});
