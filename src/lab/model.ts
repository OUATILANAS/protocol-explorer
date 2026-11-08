import{recoveryDelay,type RecoveryKind}from'./recovery';
import{isPacket}from'../types';import type{Lesson,PacketEvent,Event}from'../types';
export interface LabSettings{rtt:number;loss:number;seed:number;timer:boolean}
export interface LabResult{lesson:Lesson;lost:number;resent:number;ratio:number;baselineRtt:number;duration:number;timeouts:number;fastRetransmits:number;unrecovered:number}
export const labLessons=new Set(['tcp','udp','http','https','quic']);
export function mulberry32(seed:number){return()=>{let t=seed+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function lessonRtt(lesson:Lesson){const all=lesson.steps.flatMap(s=>s.events).filter(isPacket),syn=all.find(p=>/\[SYN\]/.test(p.row.info)),reply=syn?all.find(p=>p.from===syn.to&&p.to===syn.from&&Number(p.row.time)>Number(syn.row.time)):undefined;if(syn&&reply)return Math.max(10,(Number(reply.row.time)-Number(syn.row.time))*1000);const a=all.find(p=>p.from==='client'&&p.to==='web'),b=a?all.find(p=>p.from==='web'&&p.to==='client'&&Number(p.row.time)>Number(a.row.time)):undefined;return a&&b?Math.max(10,(Number(b.row.time)-Number(a.row.time))*1000):17}

export function lossEligible(packet:PacketEvent,id:string){
 if(packet.row.proto==='DNS')return false;
 if(id==='udp')return true;
 if(id==='quic')return !/^1-RTT, ACK$/.test(packet.row.info);
 const wire=packet.wire();return(wire.frames||[wire]).some(frame=>{const tcp=frame.layers.find(l=>l.name==='TCP'),ip=frame.layers.find(l=>l.name==='IPv4'||l.name==='IPv6');if(!tcp||!ip||tcp.bytes.length<20)return false;const flags=tcp.bytes[13];if(flags&3)return true;const view=new DataView(ip.bytes.buffer,ip.bytes.byteOffset,ip.bytes.byteLength),payload=ip.name==='IPv4'?view.getUint16(2)-ip.bytes.length-tcp.bytes.length:view.getUint16(4)-tcp.bytes.length;return payload>0});
}

export function labRun(base:Lesson,settings:LabSettings):LabResult{
 if(!labLessons.has(base.id))throw Error('This lesson does not support the lab');
 const rtt=Math.min(300,Math.max(10,settings.rtt)),loss=Math.min(30,Math.max(0,settings.loss)),baselineRtt=lessonRtt(base),scale=rtt/baselineRtt,random=mulberry32(settings.seed>>>0);let lost=0,resent=0,delay=0,timeouts=0,fastRetransmits=0,unrecovered=0;
 const original=base.steps.flatMap(s=>s.events).filter(isPacket),last=Number(original.at(-1)?.row.time)||0;
 const reliable=base.id!=='udp';
 const steps=base.steps.map(step=>({...step,facts:step.facts.map(f=>[...f] as [string,string]),events:step.events.flatMap((event):Event[]=>{
  if(!isPacket(event))return[{...event}];const drop=lossEligible(event,base.id)&&random()*100<loss,p:PacketEvent={...event,lines:[...event.lines],row:{...event.row,time:(Number(event.row.time)*scale+delay).toFixed(3)},lost:drop,labStatus:drop?'lost':undefined,sequence:event.sequence?{...event.sequence,at:(Number(event.row.time)*scale+delay)*1000,latency:event.sequence.latency*scale}:undefined};if(!drop)return[p];lost++;
  if(!reliable)return[p];
  const index=original.indexOf(event),duplicateAcks=original.slice(index+1,index+5).filter(q=>q.from===event.to&&q.to===event.from&&/Dup ACK/.test(q.row.info)).length,kind:RecoveryKind=base.id==='quic'?'pto':duplicateAcks>=3?'fast-retransmit':'rto';
  const recovery:Event[]=[p];let recovered=false,previousTime=Number(p.row.time);
  for(let attempt=0;attempt<8;attempt++){const mechanism=attempt===0?kind:kind==='fast-retransmit'?'rto':kind,timeout=recoveryDelay(mechanism,rtt,attempt);delay+=timeout;resent++;if(mechanism==='fast-retransmit')fastRetransmits++;else timeouts++;const droppedAgain=random()*100<loss;if(droppedAgain)lost++;const at=previousTime+timeout;const repeat:PacketEvent={...p,row:{...p.row,time:at.toFixed(3)},lost:droppedAgain,labStatus:droppedAgain?'lost':'resent',labRecovery:mechanism,sequence:p.sequence?{...p.sequence,at:at*1000}:undefined,tag:p.tag+' · '+(droppedAgain?'RESEND LOST':'RESENT')};recovery.push({type:'wait',duration:timeout*1000},repeat);previousTime=at;if(!droppedAgain){recovered=true;break}}
  if(!recovered)unrecovered++;return recovery;
 })}));
 const duration=last*scale+delay;return{lesson:{...base,steps,labTiming:scale,legend:[...base.legend,[null,'Lab run · not the lesson capture']]},lost,resent,ratio:last?duration/last:scale,baselineRtt,duration,timeouts,fastRetransmits,unrecovered};
}
