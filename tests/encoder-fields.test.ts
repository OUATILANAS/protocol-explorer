import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons} from '../src/lessons';
import {isPacket} from '../src/types';

test('Every field and opaque marker refers to actual bytes of its frame',()=>{
 for(const lesson of lessons)for(const packet of lesson.steps.flatMap(s=>s.events).filter(isPacket)){
  const all=packet.wire();
  for(const frame of all.frames||[all])for(const layer of frame.layers){
   const covered=new Uint8Array(layer.bytes.length);
   for(const field of layer.fields){
    assert.ok(field.offset>=0&&field.length>0&&field.offset+field.length<=layer.bytes.length,`${lesson.id}: ${packet.row.info} / ${layer.name} / ${field.name}`);
    covered.fill(1,field.offset,field.offset+field.length);
   }
   assert.ok(covered.every(x=>x===1),`${lesson.id}: all ${layer.name} bytes are inspectable`);
   for(const offset of layer.opaque||[])assert.ok(Number.isInteger(offset)&&offset>=0&&offset<layer.bytes.length);
  }
 }
});
test('Reference TCP SACK block and ICMP probe fields are encoded, not just table labels',()=>{
 const tcp=lessons.find(l=>l.id==='tcp')!.steps.flatMap(s=>s.events).filter(isPacket);
 const ack=tcp.find(p=>p.row.info.includes('SLE='))!.wire().layers.find(l=>l.name==='TCP')!;
 assert.equal(ack.bytes.length,32);assert.deepEqual(Array.from(ack.bytes.slice(20,24)),[1,1,5,10]);
 const v=new DataView(ack.bytes.buffer,ack.bytes.byteOffset);assert.equal(v.getUint32(24),1461);assert.equal(v.getUint32(28),2921);
 const probes=lessons.find(l=>l.id==='icmp')!.steps.flatMap(s=>s.events).filter(isPacket).filter(p=>p.row.info.includes('request id='));
 assert.deepEqual(probes.map(p=>p.wire().layers.find(l=>l.name==='IPv4')!.bytes[8]),[128,1,2,13]);
 assert.deepEqual(probes.map(p=>new DataView(p.wire().layers.find(l=>l.name==='ICMP')!.bytes.buffer).getUint16(4)),[1,1,1,1]);
});
