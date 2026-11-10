import {test} from 'node:test';
import assert from 'node:assert/strict';
import {destination,links} from './dist/roles.js';
test('applicant navigation contains only public tasks',()=>{assert.equal(destination({events:[]}), '#live-mine');assert.deepEqual(links({events:[]}).map(x=>x[0]),['#home','#live-events','#live-mine'])});
test('assigned staff get their workspace without admin menu',()=>{const context={admin:false,events:[{id:'a'}]};assert.equal(destination(context),'#staff');assert.ok(links(context).some(x=>x[0]==='#staff'));assert.ok(!links(context).some(x=>x[0]==='#admin'))});
test('admin gets separate administration and staff pages',()=>{const context={admin:true,events:[]};assert.equal(destination(context),'#admin');assert.ok(links(context).some(x=>x[0]==='#admin'));assert.ok(links(context).some(x=>x[0]==='#staff'))});
test('unknown roles do not display backoffice links',()=>{assert.equal(links(null).length,3);assert.equal(destination(null),'#live-mine')});
