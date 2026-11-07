import stepLabels from './step-labels.json';
import type {Lesson,PacketEvent} from '../types';
import {isPacket} from '../types';
import {captures,nodeFor,stepPackets} from './capture-plan';
import {CaptureEncoder,displayedSize} from '../wire/capture';
const compactTag=(info:string,proto:string)=>{
 if(info.includes('query response')||info.startsWith('Response A'))return'DNS REPLY';
 if(info.includes('query '))return'DNS QUERY';
 if(info.startsWith('Referral'))return'DNS REFERRAL';
 if(info.includes('[SYN, ACK]'))return'SYN-ACK';if(info.includes('[SYN]'))return'SYN';
 if(info.includes('Retransmission'))return'RETRANSMIT';if(info.includes('SLE='))return'DUP ACK + SACK';
 if(info.includes('[FIN'))return'FIN';if(proto==='TCP')return info.includes('Len=')?'DATA':'ACK';
 if(info.startsWith('Client Hello'))return'CLIENT HELLO';if(info.includes('Server Hello'))return'SERVER HELLO';
 if(info.includes('Change Cipher Spec'))return'CCS + FINISHED';
 if(info.includes('New Session Ticket'))return'SESSION TICKET';if(info.includes('close_notify'))return'CLOSE NOTIFY';
 if(info.includes('ECDH_INIT'))return'KEX INIT';if(info.includes('ECDH_REPLY'))return'KEX REPLY';
 if(info.includes('Key Exchange Init'))return'KEXINIT';if(info.includes('New Keys'))return'NEWKEYS';
 if(info.includes('SSH-2.0'))return'SSH BANNER';if(info.startsWith('Encrypted'))return'SSH ENCRYPTED';
 if(proto==='UDP')return info.includes('5004')?'VOICE FRAME':'UDP PROBE';
 return info.length>25?proto.toUpperCase():info;
};
export function applyCapture(lesson:Lesson):Lesson{
 const spec=captures.find(c=>c.id===lesson.id)!;
 const encoder=new CaptureEncoder(lesson.id);
 const original=lesson.steps.flatMap(s=>s.events).filter(isPacket);
 const packets:PacketEvent[]=spec.packets.map((row,i)=>{
  const wire=lesson.id==='http'?original[i].wire():encoder.encode(row,i);
  const len=displayedSize(wire.bytes.length,row.kilobytes);
  if(len!==displayedSize(row.bytes,row.kilobytes))throw Error(`${lesson.id} packet ${i+1}: encoded ${wire.bytes.length}, expected ${row.bytes}`);
  const sequence=lesson.id==='http'?{at:[0,12,34,51,68,88,114][i],latency:[12,12,17,17,37,23,17][i],labelFraction:.5}:undefined;
  return {type:'packet',sequence,from:nodeFor(row.src,spec),to:nodeFor(row.dst,spec),color:row.color,tag:lesson.id==='http'?original[i].tag:compactTag(row.info,row.proto),lines:lesson.id==='http'?[['A? www.example.com'],['A 203.0.113.10'],['seq=0'],['seq=0 ack=1'],['seq=1 ack=1'],['GET / HTTP/1.1','Host: www.example.com'],['HTTP/1.1 200 OK','12.2 KB in 9 segments']][i]:[row.info],lost:row.lost,row:{time:row.time.replace(/s$/,''),src:row.src,dst:row.dst,proto:row.proto,info:row.info,len},wire:()=>wire};
 });
 return {...lesson,name:spec.name,title:spec.title,nodeLabels:spec.nodes,legend:spec.legend.map(({color,label})=>[color,label]),overview:{...lesson.overview,full:spec.fullName},steps:lesson.steps.map((step,i)=>({...step,title:lesson.id==='ip'&&i===3?'NAT, Then Hop by Hop':lesson.id==='smtp'&&i===3?'Find Bob’s Server':step.title,desc:(stepLabels as Record<string,string[]>)[lesson.id][i],events:[...step.events.filter(e=>!isPacket(e)),...stepPackets[lesson.id]![i].map(n=>packets[n])]}))};
}
