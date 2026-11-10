const {randomBytes}=require('node:crypto');
const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const validReference=value=>typeof value==='string'&&/^KUSKevent-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(value);
function normalizeReference(value){if(typeof value!=='string')return null;const match=/^kuskevent-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8})$/i.exec(value.trim());return match?'KUSKevent-'+match[1].toUpperCase():null}
async function reserveReference(tx,db,applicationId,eventId,HttpsError,generate=()=>Array.from(randomBytes(8),byte=>alphabet[byte&31]).join('')){
 for(let attempt=0;attempt<20;attempt++){const referenceCode='KUSKevent-'+generate();if(!validReference(referenceCode))throw new HttpsError('internal','สร้างรหัสไม่สำเร็จ');const ref=db.doc('schoolEventReferences/'+referenceCode),snapshot=await tx.get(ref);if(!snapshot.exists){return {referenceCode,ref,data:{applicationId,eventId}}}}
 throw new HttpsError('resource-exhausted','สร้างเลขอ้างอิงไม่สำเร็จ กรุณาลองใหม่');
}
module.exports={reserveReference,validReference,normalizeReference};
