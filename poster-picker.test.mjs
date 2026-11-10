import {test} from 'node:test';import assert from 'node:assert/strict';import {posterDimensions} from './dist/poster-picker.js';
test('poster resizing preserves portrait and landscape aspect ratios without enlarging',()=>{assert.deepEqual(posterDimensions(2400,3200),{width:1200,height:1600});assert.deepEqual(posterDimensions(2400,1200),{width:1200,height:600});assert.deepEqual(posterDimensions(300,400),{width:300,height:400})});
test('invalid and excessively large images rejected',()=>{assert.throws(()=>posterDimensions(0,10));assert.throws(()=>posterDimensions(10000,10000))});
