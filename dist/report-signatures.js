export async function reportSignature(client,eventId,item,isCurrent=()=>true){
 if(!isCurrent())throw new Error('ยกเลิกการโหลดรายงานแล้ว');
 const data=await client.signCheckin({action:'view',eventId,applicationId:item.id});
 if(!isCurrent())throw new Error('ยกเลิกการโหลดรายงานแล้ว');
 if(typeof data.signaturePng!=='string'||data.signaturePng.length>280000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.signaturePng))throw new Error('รูปแบบลายเซ็นไม่ถูกต้อง');
 if(item.signatureHash&&data.sha256!==item.signatureHash)throw new Error('ข้อมูลลายเซ็นเปลี่ยนแล้ว กรุณาอัปเดตรายงาน');
 return data;
}
export function signatureImage(data,{lazy=true}={}){const img=document.createElement('img');img.className='report-signature-image';img.alt='ลายเซ็นของ '+data.signerName;img.src=data.signaturePng;if(lazy)img.loading='lazy';img.decoding='async';return img}
export async function fillReportSignatures(entries,client,eventId,isCurrent){let cursor=0;await Promise.all(Array.from({length:Math.min(3,entries.length)},async()=>{while(cursor<entries.length&&isCurrent()){const {item,cell}=entries[cursor++];if(!item.hasSignature){if(cell.isConnected)cell.textContent='';continue}try{const data=await reportSignature(client,eventId,item,()=>isCurrent()&&cell.isConnected);if(!isCurrent()||!cell.isConnected)return;cell.replaceChildren(signatureImage(data));const time=document.createElement('small');time.textContent=(data.signerName!==item.participantName?'ผู้ลงนาม: '+data.signerName+' · ':'')+(data.recordedAtMs?new Date(data.recordedAtMs).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}):'');cell.append(time)}catch(error){if(isCurrent()&&cell.isConnected)cell.textContent='โหลดลายเซ็นไม่ได้ · กรุณาอัปเดตรายงาน'}}}))}
