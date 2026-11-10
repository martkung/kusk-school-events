export function bangkokDay(ms){return Number.isFinite(ms)?new Date(ms+7*60*60*1000).toISOString().slice(0,10):''}
export function reportTime(ms){if(!Number.isFinite(ms))return 'ไม่ทราบ';const date=new Date(ms+7*60*60*1000);return date.toISOString().slice(0,19).replace('T',' ')}
export function validateReportFilters({from='',to=''}={}){
 for(const value of [from,to])if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value))throw new Error('กรุณาระบุวันที่ให้ถูกต้อง');
 if(from&&to&&from>to)throw new Error('วันเริ่มต้นต้องไม่เกินวันสิ้นสุด');
}
export function filterReport(items,filters={}){
 validateReportFilters(filters);const {from='',to='',status='all',checkin='all'}=filters;
 return items.filter(item=>{if(item.status==='deleted')return false;if(status!=='all'&&item.status!==status)return false;if(checkin==='yes'&&!item.checkedIn||checkin==='no'&&item.checkedIn)return false;const day=bangkokDay(item.createdAtMs);return (!from||day&&day>=from)&&(!to||day&&day<=to)});
}
export async function loadReportPages(client,eventId,isCurrent,onProgress=()=>{},onEvent=()=>{}){
 const items=[],ids=new Set(),cursors=new Set();let after;
 do{if(!isCurrent())return null;const page=await client.operate({action:'report',eventId,after});if(!isCurrent())return null;if(page.event)onEvent(page.event);for(const item of page.items){if(item.status!=='deleted'&&!ids.has(item.id)){items.push(item);ids.add(item.id)}}onProgress(items.length);after=page.next;if(after){if(cursors.has(after))throw new Error('โหลดไม่ครบ กรุณากดอัปเดตรายงานอีกครั้ง');cursors.add(after)}}while(after);
 return items;
}
