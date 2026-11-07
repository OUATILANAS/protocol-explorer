import{test}from'node:test';import assert from'node:assert/strict';import{lessons}from'../src/lessons';import{isPacket}from'../src/types';import{concat,checksum,pseudo}from'../src/wire/checksum';
test('multi-segment rows have valid bounded frames and an exact reassembled application stream',()=>{
 let rows=0;
 for(const lesson of lessons)for(const packet of lesson.steps.flatMap(s=>s.events).filter(isPacket)){
  const wire=packet.wire(),parts=wire.segments;if(!parts)continue;rows++;
  assert.ok(wire.reassembled,`${lesson.id} ${packet.row.info}`);
  const payloads:Uint8Array[]=[],identifiers:number[]=[];let nextSequence:number|undefined;
  for(const part of parts){
   assert.ok(part.bytes.length<=1514);const ip=part.layers.find(l=>l.name==='IPv4')!,tcp=part.layers.find(l=>l.name==='TCP')!;
   const iv=new DataView(ip.bytes.buffer,ip.bytes.byteOffset),tv=new DataView(tcp.bytes.buffer,tcp.bytes.byteOffset);
   assert.ok(iv.getUint16(2)<=1500);assert.equal(checksum(ip.bytes),0);identifiers.push(iv.getUint16(4));
   const payload=concat(...part.layers.slice(part.layers.indexOf(tcp)+1).filter(l=>l.name!=='Ethernet padding').map(l=>l.bytes));
   const transport=concat(tcp.bytes,payload),src=Array.from(ip.bytes.slice(12,16)).join('.'),dst=Array.from(ip.bytes.slice(16,20)).join('.');
   assert.equal(checksum(concat(pseudo(src,dst,6,transport.length),transport)),0);
   if(nextSequence!==undefined)assert.equal(tv.getUint32(4),nextSequence);nextSequence=tv.getUint32(4)+payload.length;
   assert.equal(ip.fields.find(f=>f.name==='Total length')!.note,'One segment: fits the 1,500-byte MTU.');payloads.push(payload);
  }
  assert.equal(new Set(identifiers).size,parts.length);assert.deepEqual(wire.reassembled!.bytes,concat(...payloads));
  assert.equal(wire.bytes.length,parts.reduce((n,f)=>n+f.bytes.length,0));
  for(const part of parts.slice(0,-1))assert.ok(part.layers.at(-1)!.fields.some(f=>/Continues in segment/.test(f.note)));
 }
 assert.ok(rows>=8,'all existing aggregate rows are covered');
});
