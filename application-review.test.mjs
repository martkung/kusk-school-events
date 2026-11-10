import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterApplications,approveSelected} from './dist/application-review.js';
test('trash is excluded from normal list but can be filtered explicitly',()=>{const items=[{id:'a',status:'deleted'},{id:'b',status:'pending'}];assert.deepEqual(filterApplications(items),[items[1]]);assert.deepEqual(filterApplications(items,'','deleted'),[items[0]])});
test('search and status intersect without mutating source',()=>{
 const items=[{id:'ABC',participantName:'Jane Smith',status:'pending'},{id:'DEF',participantName:'Jane',status:'approved'}];
 assert.deepEqual(filterApplications(items,' jane ','pending'),[items[0]]);
 assert.deepEqual(filterApplications(items,'abc'),[items[0]]);
 assert.equal(items.length,2);
});
test('bulk only processes selected pending records, reports failures and continues',async()=>{
 const items=[{id:'a',status:'pending'},{id:'b',status:'approved'},{id:'c',status:'pending'},{id:'d',status:'pending'}],calls=[];
 const result=await approveSelected(items,new Set(['a','b','c']),async id=>{calls.push(id);if(id==='a')throw new Error('สถานะเปลี่ยนแล้ว')},()=>true);
 assert.deepEqual(calls,['a','c']);assert.deepEqual(result.map(r=>r.ok),[false,true]);
});
test('bulk stops when account or event is no longer current and caps at 50',async()=>{
 const items=Array.from({length:55},(_,i)=>({id:String(i),status:'pending'})),selected=new Set(items.map(i=>i.id));let count=0;
 await approveSelected(items,selected,async()=>{count++},()=>count<2);assert.equal(count,2);
 count=0;await approveSelected(items,selected,async()=>{count++},()=>true);assert.equal(count,50);
});
