const KEY='kusk-pending-event';
export function rememberEvent(id,storage){if(/^[A-Za-z0-9_-]{1,128}$/.test(id))try{storage??=globalThis.sessionStorage;storage.setItem(KEY,id)}catch{}}
export function pendingEvent(storage){try{storage??=globalThis.sessionStorage;const id=storage.getItem(KEY);return /^[A-Za-z0-9_-]{1,128}$/.test(id||'')?id:null}catch{return null}}
export function clearPendingEvent(storage){try{storage??=globalThis.sessionStorage;storage.removeItem(KEY)}catch{}}
