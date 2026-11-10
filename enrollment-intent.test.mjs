import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rememberEvent,pendingEvent,clearPendingEvent} from './dist/enrollment-intent.js';
test('selected event survives sign-in and is cleared after resume',()=>{const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)};rememberEvent('event-123',storage);assert.equal(pendingEvent(storage),'event-123');clearPendingEvent(storage);assert.equal(pendingEvent(storage),null)});
test('invalid destinations and unavailable storage are handled',()=>{const broken={setItem(){throw Error()},getItem(){throw Error()},removeItem(){throw Error()}};assert.doesNotThrow(()=>rememberEvent('event-123',broken));assert.equal(pendingEvent(broken),null);assert.doesNotThrow(()=>clearPendingEvent(broken));let written=false;rememberEvent('https://other.example',{setItem(){written=true}});assert.equal(written,false)});
