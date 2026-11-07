import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../src/sim/engine';
import {lessons} from '../src/lessons';

test('A step jump has an interruptible lead-in before its events run',()=>{
 const engine=new Engine(lessons[0]);
 engine.seek(1,true);
 assert.deepEqual(engine.scene.nodes,['client','router']);
 assert.equal(engine.scene.url,'www.example.com');
 engine.tick(120);
 assert.equal(engine.scene.active,null);
 engine.pause();
 const paused=structuredClone(engine.scene);
 engine.tick(2000);
 assert.deepEqual(engine.scene,paused);
 engine.play();
 engine.tick(100);
 assert.ok(engine.scene.nodes.includes('dns'));
 assert.equal(engine.scene.active,null);
 engine.tick(2200);
 assert.equal(engine.scene.active?.tag,'DNS QUERY');
});

test('HTTP playback follows the measured teaching timeline independently of capture time',()=>{
 const engine=new Engine(lessons[0]);engine.reduced=()=>false;
 const departures:number[]=[];let previous:unknown=null;
 engine.onChange=()=>{if(engine.scene.active&&engine.scene.active!==previous){previous=engine.scene.active;assert.equal(engine.scene.fraction,0,'a departing packet starts at its sender');departures.push(engine.clock)}};
 engine.play();for(let i=0;i<5000&&!engine.complete;i++)engine.tick(10);
 const expected=[9630,13428,19764,23449,27180,31515,35200];
 departures.forEach((time,i)=>assert.ok(Math.abs(time-expected[i])<120,`departure ${i+1}: ${time}`));
 assert.ok(Math.abs(engine.clock-43200)<120,`complete at ${engine.clock}`);
 assert.equal(engine.scene.packets.length,7);
});

test('Every capture can travel over non-collapsed, connected diagram lanes',async()=>{
 const {path,lanePoints}=await import('../src/sim/flight');
 for(const lesson of lessons)for(const packet of lesson.steps.flatMap(step=>step.events).filter(event=>'from'in event)){
  const route=path(packet.from,packet.to);
  for(let i=1;i<route.length;i++){
   const id=`${route[i-1]}>${route[i]}`,lane=lanePoints[id];
   assert.ok(lane,`${lesson.id}: missing lane ${id}`);
   assert.ok(Math.hypot(lane[1].x-lane[0].x,lane[1].y-lane[0].y)>20,`${lesson.id}: collapsed lane ${id}`);
  }
 }
 assert.deepEqual(path('router','web'),['router','internet','web']);
});
