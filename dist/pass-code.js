export function passCode(application){
 if(application.status!=='approved')throw new Error('บัตรยังไม่ได้รับอนุมัติ');
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(application.eventId)||!/^[a-f0-9]{64}$/.test(application.id))throw new Error('รหัสบัตรไม่ถูกต้อง');
 return `KUSK1:${application.eventId}:${application.id}`;
}
export function parsePass(text,eventId){
 const value=text.trim(),parts=value.split(':');
 if(parts.length===3&&parts[0]==='KUSK1'){
  if(parts[1]!==eventId)throw new Error('บัตรนี้เป็นของกิจกรรมอื่น');
  if(/^[a-f0-9]{64}$/.test(parts[2]))return parts[2];
 }
 const short=/^kuskevent-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8})$/i.exec(value);if(short)return 'KUSKevent-'+short[1].toUpperCase();
 if(/^[a-f0-9]{64}$/.test(value))return value;
 throw new Error('รหัสบัตรไม่ถูกต้อง กรุณาสแกนหรือวางรหัสใหม่');
}
