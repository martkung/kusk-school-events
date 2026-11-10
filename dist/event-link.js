export function validEventId(id){return typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)&&!id.startsWith('__')}
export function eventLink(id,href=location.href){if(!validEventId(id))throw new Error('รหัสกิจกรรมไม่ถูกต้อง');const url=new URL(href);url.search='';url.hash='event/'+id;return url.href}
export function linkedEvent(hash){const match=/^#event\/([A-Za-z0-9_-]{1,128})$/.exec(hash);return match&&validEventId(match[1])?match[1]:null}
