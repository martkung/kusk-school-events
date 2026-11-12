// Compatibility gateway for the original kusk-event-v2 website.
// Legacy random document IDs are bearer pass links. Never expose contact/signature fields.
const {createHash}=require('node:crypto');
const hash=value=>createHash('sha256').update(value).digest('hex');
const isId=value=>typeof value==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const isPassId=value=>typeof value==='string' && /^[A-Za-z0-9]{20}$/.test(value);
function passProjection(id,data) {
  const fields=['projectId','projectName','projectDate','eventDate','firstName','lastName','applicantType','registrationNumber','registrationCode','projectCode','dailyProjectLetter','dailyProjectOrder','eventCode','fullRegistrationCode','status','checkInStatus','couponStatus','activityStatus','evaluationStatus','certificateStatus','checkedInAt','couponUsedAt','activityCompletedAt','evaluationCompletedAt','certificateIssuedAt'];
  return Object.fromEntries([['id',id],...fields.filter(k=>data[k]!==undefined).map(k=>[k,data[k]?.toDate ? data[k].toDate().toISOString() : data[k]])]);
}
function inputApplicant(data,fail) {
  if(!data || !isId(data.projectId))fail('invalid-argument','ไม่พบรหัสโครงการ');
  const limits={firstName:120,lastName:120,phone:20,email:254,applicantType:40,gradeLevel:40,classroom:80,organization:200};
  const result={projectId:data.projectId};
  for(const [key,max] of Object.entries(limits)) {
    if(data[key]!==undefined && typeof data[key]!=='string')fail('invalid-argument','รูปแบบข้อมูลไม่ถูกต้อง');
    result[key]=String(data[key]||'').trim();
    if(result[key].length>max)fail('invalid-argument','ข้อมูลยาวเกินกำหนด');
  }
  result.phone=result.phone.replace(/[\s()-]/g,'');result.email=result.email.toLowerCase();
  if(!result.firstName || !result.lastName || !/^0[0-9]{8,9}$/.test(result.phone))fail('invalid-argument','กรุณากรอกชื่อ นามสกุล และเบอร์โทรให้ถูกต้อง');
  if(result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))fail('invalid-argument','อีเมลไม่ถูกต้อง');
  return result;
}
function capacityInfo(project,rows) {
  const capacity=Number(project.capacity);
  if(!Number.isSafeInteger(capacity)||capacity<0)throw Error('Invalid project capacity');
  const registered=rows.filter(r=>!['cancelled','rejected'].includes(r.status)).length;
  return {capacity,registered,remaining:Math.max(0,capacity-registered),full:registered>=capacity};
}
function dateCode(value) {
  const s=String(value||'').trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return `${Number(m[1])>2400?Number(m[1])-543:m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if(m)return `${Number(m[3])>2400?Number(m[3])-543:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  throw Error('กรุณาให้ Admin ตั้งค่าวันที่โครงการก่อนเปิดรับสมัคร');
}
function projectLetter(projects,id) {
  const millis=v=>v?.toMillis?v.toMillis():v?.seconds?v.seconds*1000:(Date.parse(v)||0);
  const sorted=[...projects].sort((a,b)=>{
    const ao=Number(a.dailyProjectOrder||a.projectOrder||0),bo=Number(b.dailyProjectOrder||b.projectOrder||0);
    if(ao>0||bo>0)return (ao||Number.MAX_SAFE_INTEGER)-(bo||Number.MAX_SAFE_INTEGER);
    const delta=(millis(a.createdAt)||millis(a.updatedAt))-(millis(b.createdAt)||millis(b.updatedAt));
    return delta||String(a.name||a.projectName||'').localeCompare(String(b.name||b.projectName||''),'th')||a.id.localeCompare(b.id);
  });
  let n=Math.max(0,sorted.findIndex(p=>p.id===id))+1,letter='';
  while(n>0){n--;letter=String.fromCharCode(65+n%26)+letter;n=Math.floor(n/26)}
  return {letter,order:sorted.findIndex(p=>p.id===id)+1};
}
async function legacy(request,{db,HttpsError,FieldValue}) {
  const fail=(code,message)=>{throw new HttpsError(code,message)};
  const data=request.data||{},action=data.action;
  if(!['capacity','duplicate','enroll','pass','evaluation'].includes(action))fail('invalid-argument','คำสั่งไม่ถูกต้อง');
  // Bounded persistent throttling, no IP addresses or contact details stored in keys.
  const minute=Math.floor(Date.now()/60000),ip=request.rawRequest?.ip||'unknown';
  const rateRef=db.collection('legacyRequestLimits').doc(hash(`${action}:${ip}`));
  await db.runTransaction(async tx=>{const s=await tx.get(rateRef);const count=s.exists&&s.data().minute===minute?Number(s.data().count||0):0;
    if(count>=(action==='enroll'?30:300))fail('resource-exhausted','มีคำขอมากเกินไป กรุณารอสักครู่');
    tx.set(rateRef,{minute,count:count+1});
  });
  if(action==='pass'||action==='evaluation') {
    if(!isPassId(data.id))fail('permission-denied','กรุณาเปิดลิงก์บัตรที่ได้รับหลังสมัคร หรือติดต่อเจ้าหน้าที่เพื่อค้นคืนบัตร');
    const ref=db.collection('registrations').doc(data.id);
    return db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)fail('not-found','ไม่พบรายการสมัคร');const row=snap.data();
      if(action==='evaluation') {
        if(row.status!=='approved'||row.checkInStatus!=='checked_in')fail('failed-precondition','ต้องได้รับอนุมัติและเช็คอินก่อนประเมิน');
        if(!row.evaluationStatus) {
          const answers={};for(const key of ['overall','content','venue','staff']) {const score=data.answers?.[key];if(!Number.isInteger(score)||score<1||score>5)fail('invalid-argument','คะแนนต้องเป็นจำนวนเต็ม 1–5');answers[key]=score;}
          if(typeof (data.comment??'')!=='string'||(data.comment||'').length>1000)fail('invalid-argument','ความคิดเห็นยาวเกินกำหนด');
          const average=Number((Object.values(answers).reduce((a,b)=>a+b,0)/4).toFixed(2));
          tx.update(ref,{evaluationStatus:'completed',evaluationCompletedAt:FieldValue.serverTimestamp(),evaluationBy:'ผู้เข้าร่วม',evaluationVersion:'standard-v1',evaluationAnswers:answers,evaluationAverageScore:average,evaluationScoreOverall:answers.overall,evaluationScoreContent:answers.content,evaluationScoreVenue:answers.venue,evaluationScoreStaff:answers.staff,evaluationComment:(data.comment||'').trim()});
          row.evaluationStatus='completed';
        }
      }
      return {success:true,data:passProjection(snap.id,row)};
    });
  }
  if(!isId(data.projectId))fail('invalid-argument','รหัสโครงการไม่ถูกต้อง');
  const projectRef=db.collection('projects').doc(data.projectId),rowsQuery=db.collection('registrations').where('projectId','==',data.projectId);
  if(action==='capacity') {
    const [project,rows]=await Promise.all([projectRef.get(),rowsQuery.get()]);if(!project.exists)fail('not-found','ไม่พบโครงการ');
    return {success:true,...capacityInfo(project.data(),rows.docs.map(s=>s.data()))};
  }
  // Preliminary duplicate checks disclose no existing record; enrollment rechecks atomically.
  if(action==='duplicate')return {success:true,duplicate:false,data:null};
  const applicant=inputApplicant(data.applicant,fail);
  if(applicant.projectId!==data.projectId)fail('invalid-argument','รหัสโครงการไม่ตรงกัน');
  const counterRef=db.collection('registrationCounters').doc(data.projectId),ref=db.collection('registrations').doc();
  return db.runTransaction(async tx=>{
    const [project,counter,rows]=await Promise.all([tx.get(projectRef),tx.get(counterRef),tx.get(rowsQuery)]);
    if(!project.exists)fail('not-found','ไม่พบโครงการ');const p=project.data();
    const status=String(p.status||'').trim().toLowerCase();
    if(!['open','active','เปิด','เปิดรับสมัคร'].includes(status)||p.deleted===true)fail('failed-precondition','โครงการนี้ปิดรับสมัครแล้ว');
    const all=rows.docs.map(s=>s.data());
    const duplicate=all.some(r=>String(r.phone||'').replace(/[\s()-]/g,'')===applicant.phone || (applicant.email&&String(r.email||'').trim().toLowerCase()===applicant.email));
    if(duplicate)return {success:false,duplicate:true,error:'คุณได้สมัครโครงการนี้แล้ว หากต้องการบัตรเดิมกรุณาติดต่อเจ้าหน้าที่'};
    if(capacityInfo(p,all).full)fail('resource-exhausted','โครงการนี้มีผู้สมัครครบจำนวนแล้ว');
    const last=Math.max(Number(counter.exists?counter.data().lastNumber||0:0),...all.map(r=>Number(r.registrationNumber)||0),0);
    if(!Number.isSafeInteger(last)||last<0)fail('failed-precondition','เลขลำดับโครงการไม่ถูกต้อง');
    const number=last+1,short=String(number).padStart(3,'0');
    const eventDate=counter.exists&&counter.data().eventDate||dateCode(p.date||p.projectDate);
    const daily=await tx.get(db.collection('projects').where('date','==',p.date||p.projectDate||''));
    const dailyProjects=daily.docs.map(s=>({...s.data(),id:s.id}));
    if(!dailyProjects.some(x=>x.id===data.projectId))dailyProjects.push({...p,id:data.projectId});
    const position=projectLetter(dailyProjects,data.projectId);
    const letter=String(counter.exists&&counter.data().dailyProjectLetter||p.dailyProjectLetter||p.projectLetter||position.letter).replace(/[^A-Z]/g,'').slice(0,3)||position.letter;
    const eventCode=`${eventDate}-${letter}${short}`;
    const row={...applicant,projectName:String(p.name||''),projectDate:eventDate,eventDate,dailyProjectLetter:letter,dailyProjectOrder:position.order,registrationNumber:number,registrationCode:short,projectCode:`${eventDate}-${letter}`,eventCode,fullRegistrationCode:eventCode,status:'pending',createdAt:FieldValue.serverTimestamp()};
    tx.set(counterRef,{projectId:data.projectId,lastNumber:number,eventDate,dailyProjectLetter:letter,updatedAt:FieldValue.serverTimestamp()},{merge:true});tx.create(ref,row);
    return {success:true,id:ref.id,registrationCode:short,eventCode,data:passProjection(ref.id,row)};
  });
}
module.exports={legacy,passProjection,inputApplicant,capacityInfo,dateCode};
