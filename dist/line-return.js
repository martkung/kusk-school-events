import {localLineEndpoint,restoreLineHints} from './line-login-flow.js';
export function isLineReturn(href){
 const url=new URL(href),params=url.searchParams;
 // Only recognize LIFF's own markers, never arbitrary OAuth or application state.
 return params.has('liff.state')||params.get('liffClientId')==='2012417122'||params.has('liff.referrer');
}
export async function completeLineReturn({initialize,replace,href}){
 // SDK must consume primary redirect credentials before changing the URL.
 await initialize();
 restoreLineHints(href);replace(localLineEndpoint(href));
}
