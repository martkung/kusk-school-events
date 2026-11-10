const KEY='kusk-login-return';
export function rememberMyActivities(storage){try{storage??=globalThis.sessionStorage;storage.setItem(KEY,'#live-mine')}catch{}}
export function loginReturn(storage){try{storage??=globalThis.sessionStorage;return storage.getItem(KEY)==='#live-mine'?'#live-mine':null}catch{return null}}
export function consumeLoginReturn(storage){const route=loginReturn(storage);try{storage??=globalThis.sessionStorage;storage.removeItem(KEY)}catch{}return route}
