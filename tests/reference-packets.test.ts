import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{lessons}from'../src/lessons';import{Engine}from'../src/sim/engine';
import{isPacket}from'../src/types';
const reference=JSON.parse(readFileSync(new URL('../upgrade/reference/reference-packets.json',import.meta.url),'utf8'));
for(const expected of reference.lessons){
 test(`${expected.id}: natural playback rows deep-equal the supplied capture`,()=>{
  const lesson=lessons.find(l=>l.id===expected.id)!;
  const engine=new Engine(lesson);engine.reduced=()=>true;engine.play();
  for(let i=0;i<10000&&!engine.complete;i++)engine.tick(1000);
  assert.ok(engine.complete,'lesson finishes');
  assert.deepEqual(engine.scene.packets.map(p=>({time:p.row.time+'s',src:p.row.src,dst:p.row.dst,proto:p.row.proto,info:p.row.info,size:p.row.len,lost:p.lost??false,color:p.color})),expected.packets);
  assert.deepEqual(lesson.legend.map(([color,label])=>({color,label})),expected.legend);
  assert.deepEqual(lesson.nodeLabels,expected.nodes);
  assert.equal(lesson.title,expected.title);assert.equal(lesson.name,expected.name);assert.equal(lesson.overview.full,expected.fullName);
  for(const p of engine.scene.packets){const length=p.wire().bytes.length;assert.equal(p.row.len,p.row.len.endsWith('KB')?`${(length/1024).toFixed(1)} KB`:`${length} B`)}
 });
}
test('Every laptop UDP DNS query has no DF, first HTTP checksum is 0x90c8',()=>{
 for(const l of lessons)for(const p of l.steps.flatMap(s=>s.events).filter(isPacket)){
  if(p.row.proto==='DNS'&&p.row.src==='192.168.1.10'&&p.row.info.includes('query ')&&!p.row.info.includes('response')){
   const ip=p.wire().layers.find(l=>l.name==='IPv4')!;
   assert.equal(new DataView(ip.bytes.buffer,ip.bytes.byteOffset).getUint16(6),0);
  }
 }
 const first=lessons[0].steps.flatMap(s=>s.events).filter(isPacket)[0].wire();
 assert.equal(new DataView(first.bytes.buffer).getUint16(24),0x90c8);
});
