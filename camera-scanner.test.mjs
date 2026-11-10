import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import QR from './dist/vendor/qr.js';
import {cameraError} from './dist/camera-scanner.js';
import {passCode,parsePass} from './dist/pass-code.js';
const require=createRequire(import.meta.url);
const {QRCodeReader,RGBLuminanceSource,BinaryBitmap,HybridBinarizer}=require('./tooling/node_modules/@zxing/library');
test('scanner decodes generated pass including quiet zone',()=>{
 const record={eventId:'test-event',id:'c'.repeat(64),status:'approved'},payload=passCode(record),qr=QR.create(payload);
 const scale=6,margin=4,size=(qr.modules.size+margin*2)*scale,pixels=new Uint8ClampedArray(size*size);pixels.fill(255);
 for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)pixels[((y+margin)*scale+dy)*size+(x+margin)*scale+dx]=0;
 const result=new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,size,size))));
 assert.equal(result.getText(),payload);assert.equal(parsePass(result.getText(),'test-event'),record.id);
});
test('camera permission and unavailable-device failures have actionable messages',()=>{assert.match(cameraError({name:'NotAllowedError'}),/อนุญาต/);assert.match(cameraError({name:'NotFoundError'}),/ไม่พบกล้อง/);assert.match(cameraError({name:'NotReadableError'}),/แอปกล้องอื่น/)});
