import{isPacket}from'../types';import type{Lesson,PacketEvent,Event}from'../types';
export interface LabSettings{rtt:number;loss:number;seed:number;timer:boolean}
export interface LabResult{lesson:Lesson;lost:number;resent:number;ratio:number;baselineRtt:number;duration:number}
export const labLessons=new Set(['tcp','udp','http','https','quic']);
export function mulberry32(seed:number){return()=>{let t=seed+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function lessonRtt(lesson:Lesson){const all=lesson.steps.flatMap(s=>s.events).filter(isPacket),syn=all.find(p=>/\[SYN\]/.test(p.row.info)),reply=syn?all.find(p=>p.from===syn.to&&p.to===syn.from&&Number(p.row.time)>Number(syn.row.time)):undefined;if(syn&&reply)return Math.max(10,(Number(reply.row.time)-Number(syn.row.time))*1000);const a=all.find(p=>p.from==='client'&&p.to==='web'),b=a?all.find(p=>p.from==='web'&&p.to==='client'&&Number(p.row.time)>Number(a.row.time)):undefined;return a&&b?Math.max(10,(Number(b.row.time)-Number(a.row.time))*1000):17}
export function labRun(base:Lesson,settings:LabSettings):LabResult{
 if(!labLessons.has(base.id))throw Error('This lesson does not support the lab');
 const rtt=Math.min(300,Math.max(10,settings.rtt)),loss=Math.min(30,Math.max(0,settings.loss)),baselineRtt=lessonRtt(base),scale=rtt/baselineRtt,random=mulberry32(settings.seed>>>0);let lost=0,resent=0,delay=0;
 const original=base.steps.flatMap(s=>s.events).filter(isPacket),last=Number(original.at(-1)?.row.time)||0;
 const reliable=base.id!=='udp';
 const steps=base.steps.map(step=>({...step,facts:step.facts.map(f=>[...f] as [string,string]),events:step.events.flatMap((event):Event[]=>{
  if(!isPacket(event))return[{...event}];const drop=random()*100<loss,p:PacketEvent={...event,lines:[...event.lines],row:{...event.row,time:(Number(event.row.time)*scale+delay).toFixed(3)},lost:drop,labStatus:drop?'lost':undefined,sequence:event.sequence?{...event.sequence,at:(Number(event.row.time)*scale+delay)*1000,latency:event.sequence.latency*scale}:undefined};if(!drop)return[p];lost++;
  if(!reliable)return[p];
  const index=original.indexOf(event),duplicateAcks=original.slice(index+1,index+5).filter(q=>/Dup ACK/.test(q.row.info)).length,timeout=base.id==='quic'?Math.max(.02,3*rtt/1000):duplicateAcks>=3?rtt/1000:1;
  delay+=timeout;resent++;const repeat:PacketEvent={...p,row:{...p.row,time:(Number(p.row.time)+timeout).toFixed(3)},lost:false,labStatus:'resent',sequence:p.sequence?{...p.sequence,at:(Number(p.row.time)+timeout)*1000}:undefined,tag:p.tag+' · RESENT'};
  return[p,{type:'wait',duration:timeout*1000},repeat];
 })}));
 const duration=last*scale+delay;return{lesson:{...base,steps,labTiming:scale,legend:[...base.legend,[null,'Lab run · not the lesson capture']]},lost,resent,ratio:last?duration/last:scale,baselineRtt,duration};
}
