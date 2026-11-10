const expected=new Set(['unauthenticated','permission-denied','invalid-argument','not-found','already-exists','failed-precondition','resource-exhausted','cancelled','out-of-range','aborted']);
const actions=new Set(['save','view','preview','start','step','deleteEvent','restoreEvent','saveBanner','deleteBanner','health','report','lookupStaff','listStaff','assign','list','createEvent','editEvent','setPoster','pauseRegistration','pauseCheckin','deleteApplication','restoreApplication','editApplication','contact','previewCheckin','checkin','cancel','approve','reject']);
exports.safeCall=async(operation,request,handler,{logger,HttpsError})=>{
 try{return await handler(request)}catch(error){
  // Expected caller/business errors are not system incidents. Never log input or Error objects.
  if(error instanceof HttpsError&&expected.has(error.code))throw error;
  const code=error instanceof HttpsError&&['internal','unavailable','deadline-exceeded','unknown'].includes(error.code)?error.code:'internal';
  try{logger.error('school_event_system_failure',{tag:'kusk_school_events',operation:['enroll','operate','purge','signature'].includes(operation)?operation:'other',action:operation==='enroll'?'enroll':actions.has(request?.data?.action)?request.data.action:'other',errorCode:code})}catch{}
  throw new HttpsError(code,'ระบบขัดข้องชั่วคราว กรุณาลองใหม่ หากยังไม่สำเร็จให้ติดต่อผู้ดูแล');
 }
};
