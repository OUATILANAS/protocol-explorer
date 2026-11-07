import type {Lesson,Scene,Event} from '../types';
import {isPacket} from '../types';
import {read,write} from '../state/storage';
import {mark} from '../state/progress';
import {packetFlight} from './flight';

export class Engine {
 lesson:Lesson;
 stepIndex=-1; eventIndex=0; playing=false; speed=read<number>('speed',1); clock=0;
 scene:Scene;
 phase:'event'|'gap'|'step-gap'|'step-intro'='event';
 elapsed=0; started=false; duration=0; cameraVersion=0; seekVersion=0;
 onChange=()=>{}; onFrame=()=>{};
 reduced=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 private rebuilding=false;
 constructor(lesson:Lesson){this.lesson=lesson;this.scene=this.fresh();if(![.5,1,1.5,2].includes(this.speed))this.speed=1}
 get lessonId(){return this.lesson.id}
 get complete(){return this.stepIndex>=this.lesson.steps.length}
 get event(){return this.lesson.steps[this.stepIndex]?.events[this.eventIndex]}
 fresh():Scene{return{nodes:[...this.lesson.start.nodes],frame:this.lesson.start.frame,url:'',urlVisible:false,urlLoaded:false,urlTyping:false,notes:[],packets:[],active:null,fraction:0}}
 setLesson(lesson:Lesson){this.lesson=lesson;this.reset()}
 apply(e:Event){
  if(isPacket(e)){this.scene.packets.push(e);this.scene.active=null;this.scene.fraction=0}
  else if(e.type==='show'){
   this.scene.nodes=[...new Set([...this.scene.nodes,...e.nodes])];
   if(e.frame){this.scene.frame=e.frame;if(!this.rebuilding)this.cameraVersion++}
  }else if(e.type==='camera'){this.scene.frame=e.frame;if(!this.rebuilding)this.cameraVersion++}
  else if(e.type==='type-url'){this.scene.url=e.text;this.scene.urlVisible=true;this.scene.urlLoaded=false;this.scene.urlTyping=false}
  else if(e.type==='hide-url'){this.scene.urlVisible=false;this.scene.urlTyping=false}
  else if(e.type==='loaded-url'){this.scene.url=e.text;this.scene.urlVisible=true;this.scene.urlLoaded=true;this.scene.urlTyping=false}
  else if(e.type==='note')this.scene.notes.push({at:e.at,text:e.text,tone:e.tone||'amber'});
 }
 beginStep(index:number){
  this.stepIndex=index;this.eventIndex=0;this.started=false;this.phase='event';this.elapsed=0;
  this.scene.notes=[];this.scene.active=null;
  if(this.complete){this.playing=false;mark(this.lesson.id,'complete')}
  this.onChange();
 }
 play(){if(this.complete){this.replay();return}if(this.stepIndex<0)this.beginStep(0);this.playing=true;mark(this.lesson.id,'in-progress');this.onChange()}
 pause(){this.playing=false;this.onChange()}
 toggle(){this.playing?this.pause():this.play()}
 reset(){this.playing=false;this.stepIndex=-1;this.eventIndex=0;this.clock=0;this.scene=this.fresh();this.phase='event';this.started=false;this.elapsed=0;this.seekVersion++;this.onChange()}
 seek(index:number,autoplay=false){
  const target=Math.max(-1,Math.min(index,this.lesson.steps.length));
  this.playing=false;this.scene=this.fresh();this.rebuilding=true;
  for(let i=0;i<target;i++){this.scene.notes=[];for(const e of this.lesson.steps[i].events)this.apply(e)}
  this.rebuilding=false;this.stepIndex=target;this.eventIndex=0;this.started=false;this.elapsed=0;
  this.phase=target>=0&&!this.complete?'step-intro':'event';this.scene.active=null;this.scene.notes=[];this.clock=0;this.seekVersion++;
  if(this.complete)mark(this.lesson.id,'complete');else if(target>=0)mark(this.lesson.id,'in-progress');
  this.playing=autoplay&&target>=0&&!this.complete;this.onChange();
 }
 step(){if(!this.complete)this.seek(this.stepIndex+1)}
 back(){this.seek(this.stepIndex-1)}
 replay(){this.reset();this.play()}
 cycleSpeed(){const speeds=[1,1.5,2,.5];this.speed=speeds[(speeds.indexOf(this.speed)+1)%4];write('speed',this.speed);this.onChange()}
 tick(dt:number){
  if(!this.playing)return;
  let remaining=Math.max(0,Math.min(dt,10000))*this.speed,guard=0;
  const reduced=this.reduced(),timing=this.lesson.playback;
  // The simulation clock advances only for consumed time, including at event boundaries.
  const consume=(duration:number)=>{const d=Math.min(remaining,Math.max(0,duration-this.elapsed));this.elapsed+=d;this.clock+=d;remaining-=d;return this.elapsed>=duration};
  while(this.playing&&remaining>=0&&guard++<300){
   if(this.phase==='step-intro'){
    if(!consume(reduced?1:200))break;
    this.elapsed=0;this.phase='event';continue;
   }
   if(this.phase==='gap'||this.phase==='step-gap'){
    const duration=reduced?1:this.phase==='gap'?(timing?.packetGap??1200):(timing?.stepGap??1800);
    if(!consume(duration))break;
    this.elapsed=0;
    if(this.phase==='step-gap')this.beginStep(this.stepIndex+1);
    else {this.eventIndex++;this.phase='event';this.started=false}
    continue;
   }
   const event=this.event;
   if(!event){this.phase='step-gap';this.elapsed=0;continue}
   const timed=isPacket(event)||event.type==='type-url'||event.type==='wait';
   if(!timed){this.apply(event);this.eventIndex++;this.onChange();continue}
   if(!this.started){
    this.started=true;this.elapsed=0;
    this.duration=reduced?1:event.type==='wait'?event.duration:event.type==='type-url'?(timing?timing.urlHold+event.text.length*timing.characterTime:1100):timing?packetFlight(event.from,event.to).duration:900*(this.lesson.latency[`${event.from}-${event.to}`]||1);
    if(isPacket(event)){this.scene.active=event;this.scene.fraction=0}
    else if(event.type==='type-url'){this.scene.url='';this.scene.urlVisible=true;this.scene.urlLoaded=false;this.scene.urlTyping=true}
    this.onChange();
   }
   const finished=consume(this.duration);
   this.scene.fraction=Math.min(1,this.elapsed/this.duration);
   if(event.type==='type-url'){
    const count=reduced?event.text.length:timing?Math.floor(Math.max(0,this.elapsed-timing.urlHold)/timing.characterTime):Math.floor(event.text.length*this.scene.fraction);
    this.scene.url=event.text.slice(0,count);
   }
   this.onFrame();
   if(!finished)break;
   this.apply(event);this.elapsed=0;this.started=false;
   // Waits and typing own their complete duration. Only wire packets add an inter-packet pause.
   if(isPacket(event))this.phase='gap';else this.eventIndex++;
   this.onChange();
   if(remaining===0)break;
  }
 }
}
