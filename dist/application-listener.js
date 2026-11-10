export function watchOwnedApplications({sdk,db,auth},onData,onError){
 const uid=auth.currentUser?.uid;if(!uid)throw new Error('กรุณาเข้าสู่ระบบ');
 const query=sdk.query(sdk.collection(db,'schoolEventApplications'),sdk.where('ownerUid','==',uid));
 let closed=false;
 const stop=sdk.onSnapshot(query,{includeMetadataChanges:true},snapshot=>{
  if(closed||auth.currentUser?.uid!==uid)return;
  onData(snapshot.docs.map(doc=>({...doc.data(),id:doc.id})),{fromCache:snapshot.metadata.fromCache});
 },error=>{if(!closed&&auth.currentUser?.uid===uid)onError?.(error)});
 return ()=>{closed=true;stop()};
}
