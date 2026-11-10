import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobileBrowser,mountMobileGoogle} from './dist/google-mobile.js';
test('mobile selects direct Google flow while desktop stays unchanged',()=>{assert.equal(mobileBrowser({userAgent:'Mozilla Android Chrome'}),true);assert.equal(mobileBrowser({userAgent:'iPhone'}),true);assert.equal(mobileBrowser({platform:'MacIntel',maxTouchPoints:5}),true);assert.equal(mobileBrowser({userAgent:'Windows Chrome'}),false)});
test('Google callback exchanges credential through Firebase and ignores disposed flow',async()=>{
 let configuration,rendered=false,received,redirects=0;
 globalThis.window={google:{accounts:{id:{initialize:options=>configuration=options,renderButton:()=>rendered=true}}}};
 const host={clientWidth:300,replaceChildren(){}};
 const cleanup=await mountMobileGoogle({host,client:{signInGoogleCredential:async token=>received=token},onSuccess:async()=>redirects++,onError:error=>{throw error}});
 assert.equal(rendered,true);await configuration.callback({credential:'test-credential'});assert.equal(received,'test-credential');assert.equal(redirects,1);
 cleanup();await configuration.callback({credential:'ignored'});assert.equal(received,'test-credential');assert.equal(redirects,1);delete globalThis.window;
});
