exports.reportList=async(request,{db,HttpsError})=>{
 const uid=request.auth.uid,admin=request.auth.token?.admin===true,{eventId,after}=request.data;
 const assignment=db.doc(`schoolEventStaff/${uid}/events/${eventId}`),allowed=data=>admin||data?.active===true&&data.permissions?.includes('reports');
 if(!allowed((await assignment.get()).data()))throw new HttpsError('permission-denied','ไม่มีสิทธิ์รายงานกิจกรรมนี้');
 const available=async()=>{const event=await db.doc(`schoolEventCatalog/${eventId}`).get();if(!event.exists||event.data()?.purging===true)throw new HttpsError('failed-precondition','กิจกรรมกำลังลบถาวรหรือถูกลบแล้ว ไม่สามารถออกรายงานบางส่วนได้');return event.data()};
 await available();
 let query=db.collection('schoolEventApplications').where('eventId','==',eventId).orderBy('__name__').limit(50);
 if(after){if(typeof after!=='string'||!/^[\w-]{1,128}$/.test(after))throw new HttpsError('invalid-argument','หน้ารายงานไม่ถูกต้อง');query=query.startAfter(after)}
 const page=await query.get();if(!allowed((await assignment.get()).data()))throw new HttpsError('permission-denied','สิทธิ์รายงานถูกถอนแล้ว');
 const event=await available();
 const millis=value=>{const result=value?.toMillis?.();return Number.isFinite(result)?result:null};
 return {event:{id:eventId,name:event.name||'',date:event.date||'',place:event.place||''},items:page.docs.filter(doc=>doc.data().status!=='deleted').map(doc=>{const data=doc.data();return {id:doc.id,...(data.checkinSignature?{hasSignature:true,signatureHash:data.checkinSignature.sha256}:{}),...(data.referenceCode?{referenceCode:data.referenceCode}:{}),participantName:data.participantName||'',status:data.status,checkedIn:data.checkedIn===true,createdAtMs:millis(data.createdAt),checkedInAtMs:millis(data.checkedInAt)}}),next:page.size===50?page.docs.at(-1).id:null};
};
