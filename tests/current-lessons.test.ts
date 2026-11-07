import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{currentLessons,prepareLesson}from'../src/lessons/current';import{Engine}from'../src/sim/engine';import{isPacket}from'../src/types';
const reference=JSON.parse(readFileSync('tests/fixtures/reference-33-packets.json','utf8'));
test('current catalog preserves the live order, counts and authored explanations',async()=>{
 await Promise.all(currentLessons.map(l=>prepareLesson(l.id)));
 assert.equal(currentLessons.length,33);assert.deepEqual(currentLessons.map(l=>l.id),reference.lessons.map(l=>l.id));
 for(const[group,count]of[['core',8],['application',16],['security',9]]as const)assert.equal(currentLessons.filter(l=>l.category===group).length,count);
 for(const l of currentLessons){assert.ok(l.overview.description.length>60);assert.ok(l.outro.text.length>60);for(const s of l.steps)assert.ok(s.detail.length>60,`${l.id}/${s.title}`)}
});
for(const target of reference.lessons)test(`${target.id}: current playback and seeking preserve exact capture rows`,async()=>{
 const lesson=await prepareLesson(target.id);const engine=new Engine(lesson);engine.reduced=()=>true;engine.play();for(let i=0;i<10000&&!engine.complete;i++)engine.tick(1000);assert.ok(engine.complete);
 assert.deepEqual(engine.scene.packets.map(p=>({time:p.row.time+'s',src:p.row.src,dst:p.row.dst,proto:p.row.proto,info:p.row.info,len:p.row.len,color:p.color,lost:p.lost||false})),target.packets);
 for(let index=0;index<=lesson.steps.length;index++){
  const direct=new Engine(lesson);direct.seek(index);
  const natural=new Engine(lesson);for(const step of lesson.steps.slice(0,index)){natural.scene.notes=[];for(const event of step.events)natural.apply(event)}natural.scene.notes=[];
  assert.deepEqual(direct.scene,natural.scene,`${lesson.id}/${index}`);
 }
 for(const p of lesson.steps.flatMap(s=>s.events).filter(isPacket))assert.ok(p.wire().bytes.length>0);
});
