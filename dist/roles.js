import {isManager} from './delegation.js';
export function destination(context){return isManager(context)?'#admin':context?.events?.length?'#staff':'#live-mine'}
export function links(context){
 const items=[['#home','หน้าแรก'],['#live-events','กิจกรรมทั้งหมด'],['#live-mine','กิจกรรมของฉัน']];
 if(isManager(context))return [...items,['#admin','จัดการระบบ'],['#staff','งานเจ้าหน้าที่']];
 return context?.events?.length?[...items,['#staff','งานที่ได้รับมอบหมาย']]:items;
}
