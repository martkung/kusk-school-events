import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eventPayload} from './dist/admin-event-form.js';
const form=(values={})=>({elements:Object.fromEntries(Object.entries({name:' กิจกรรมโรงเรียน ',date:'20 มกราคม 2570',place:'โรงเรียน',description:'รายละเอียด',capacity:'20',...values}).map(([k,value])=>[k,{value}]))});
test('capacity is numeric and submitted text is trimmed',()=>{const event=eventPayload(form());assert.equal(event.name,'กิจกรรมโรงเรียน');assert.equal(event.capacity,20)});
test('empty names and fractional or invalid capacity cannot submit',()=>{for(const values of [{name:' '},{capacity:'0'},{capacity:'1.5'},{capacity:'100001'},{capacity:'invalid'}])assert.throws(()=>eventPayload(form(values)))});

import {createRequire} from 'node:module';import {mountEventForm} from './dist/admin-event-form.js';const require=createRequire(new URL('./tooling/package.json',import.meta.url)),{JSDOM}=require('jsdom');
test('create event suppresses simultaneous submissions and stops the next step after leaving the form',async()=>{const dom=new JSDOM('<div id="root"></div>',{url:'https://school.test/#admin'});globalThis.document=dom.window.document;let finish,calls=0,callbacks=0;const client={operate:()=>{calls++;return new Promise(r=>finish=r)}};const root=document.querySelector('#root');mountEventForm(root,client,()=>callbacks++);const f=root.querySelector('form');for(const [key,value] of Object.entries({name:'Demo',date:'Tomorrow',place:'School',description:'Demo',capacity:'20'}))f.elements[key].value=value;const first=f.onsubmit({preventDefault(){}});await f.onsubmit({preventDefault(){}});assert.equal(calls,1);root.remove();finish({ok:true});await first;assert.equal(callbacks,0);dom.window.close()});
