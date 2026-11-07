import type {Layer,WireFrame,LessonId} from '../types';
import type {CaptureRow} from '../lessons/capture-plan';
import {field,layer,frame,MSS} from './common';
import {concat,u16,u32,checksum} from './checksum';
import {ethernet} from './ethernet';
import {ipv4} from './ipv4';
import {tcpFrame,udpFrame,aggregate} from './index';
import {SYN_OPTIONS,type TCPOptions} from './tcp';
import {arpFrame} from './arp';
import {dnsCapture} from './dns';
import {dhcp} from './dhcp';
import {icmp} from './icmp';
import {rtp} from './rtp';
import {tls,tlsClientHello,tlsRecords} from './tls';
import {ssh,sshCapture} from './ssh';
import {text} from './text';

export const displayedSize=(bytes:number,kilobytes=false)=>kilobytes?`${(bytes/1024).toFixed(1)} KB`:`${bytes} B`;
const allOpaque=(name:string,size:number,color:Layer['color']):Layer=>layer(name,color,Uint8Array.from({length:size},(_,i)=>(17+i*37)%256),[field('Opaque content',`${size} illustrative bytes`,'Encrypted, random or file content is not shown by this lesson.',0,size)],Array.from({length:size},(_,i)=>i));
export function sliceLayer(source:Layer,start:number,end:number):Layer{
 const fields=source.fields.filter(f=>f.offset<end&&f.offset+f.length>start).map(f=>{const a=Math.max(start,f.offset),b=Math.min(end,f.offset+f.length);return{...f,offset:a-start,length:b-a}});
 return layer(source.name,source.color,source.bytes.slice(start,end),fields,source.opaque?.filter(i=>i>=start&&i<end).map(i=>i-start));
}
const timestamps=new Uint8Array([1,1,8,10,0,0,0,1,0,0,0,1]);
const synTimestamp=concat(new Uint8Array([2,4,5,180,4,2,8,10]),u32(1),u32(0),new Uint8Array([1,3,3,7]));
const ports:Record<LessonId,[number,number]>={http:[52344,80],https:[52411,443],tcp:[49152,80],udp:[50000,5004],ip:[52344,443],dns:[59321,53],dhcp:[68,67],icmp:[52500,9999],smtp:[52900,465],pop3:[53010,995],imap:[53140,993],ftp:[52800,21],ssh:[53210,22],tls:[52411,443]};
function serverFlight(length:number){const hello=tls('server-hello'),ccs=tls('ccs');return tlsRecords([hello,ccs,tls('encrypted',length-hello.bytes.length-ccs.bytes.length-5)])}
function plaintext(info:string,size:number,name:string){
 let content=info.replace(/^(Client|Server): /,'').replace(/ …/g,'').replace(/“|”/g,'');
 const lines:Record<string,string>={'220 (vsFTPd 3.0.5)':'220 (vsFTPd 3.0.5)','150 Opening BINARY mode data connection …':'150 Opening BINARY mode data connection for report.pdf (4000 bytes).'};
 content=lines[info]||content;
 const encode=new TextEncoder();
 while(encode.encode(content+'\r\n').length>size)content=content.slice(0,-1);
 while(encode.encode(content+'\r\n').length<size)content+=' ';
 return text(name,content+'\r\n');
}
export class CaptureEncoder{
 private sequence=new Map<string,number>();
 private flight=serverFlight(1460+1460+1030);
 constructor(private id:LessonId){}
 encode(row:CaptureRow,index:number):WireFrame{
  if(row.proto==='ARP')return arpFrame(index===1);
  if(row.proto==='DNS')return this.dns(row);
  if(row.proto==='DHCP'){
   const type=/Discover/.test(row.info)?1:/Offer/.test(row.info)?2:/ACK/.test(row.info)?5:3;
   const renew=Number.parseFloat(row.time)>1;
   const payload=dhcp(type,renew,{length:row.bytes-42,xid:renew?0x7a1c22e5:0x3903f326,lease:86400});
   const f=udpFrame(row.src,row.dst,type===2||type===5?67:68,type===2||type===5?68:67,payload,type===2||type===5);
   if(row.dst==='255.255.255.255'){f.layers[0].bytes.fill(255,0,6);f.layers[0].fields[0].value='ff:ff:ff:ff:ff:ff';f.bytes.set(f.layers[0].bytes,0)}
   return f;
  }
  if(row.proto==='ICMP')return this.icmp(row,index);
  if(row.proto==='UDP'){
   const match=row.info.match(/(\d+) → (\d+)/)!;
   const payload=this.id==='udp'?rtp(index+1,80):layer('Probe','amber',new Uint8Array(row.bytes-42),[field('Probe data',`${row.bytes-42} bytes`,'Application bytes addressed to the destination port.',0,row.bytes-42)]);
   return udpFrame(row.src,row.dst,Number(match[1]),Number(match[2]),payload,row.dst==='192.168.1.10');
  }
  return this.tcp(row,index);
 }
 private dns(row:CaptureRow){
  const query=row.info.includes('query ')&&!row.info.includes('query response');
  const name=this.id==='smtp'?(row.info.includes(' MX ')?'example.org':'mx.example.org'):'www.example.com';
  const kind=query?'query':row.info.startsWith('Referral: com.')?'root-referral':row.info.startsWith('Referral: example.com.')?'tld-referral':row.info.includes(' MX ')?'mx':'answer';
  const payload=dnsCapture({name,kind,answer:row.info.includes('198.51.100.25')?'198.51.100.25':'203.0.113.10',authoritative:row.info.includes('authoritative'),length:row.bytes-42,edns:row.bytes!==75&&row.bytes!==91});
  // MX queries use QTYPE 15 rather than an A question.
  if(query&&row.info.includes(' MX ')){
   const question=payload.fields.find(f=>f.name==='Question')!;
   const offset=question.offset+question.length-4;new DataView(payload.bytes.buffer).setUint16(offset,15);question.value=`${name} · MX · IN`;
  }
  return udpFrame(row.src,row.dst,query?59321:53,query?53:59321,payload,row.dst==='192.168.1.10');
 }
 private icmp(row:CaptureRow,index:number){
  const echo=row.info.includes('Echo'),reply=row.info.includes('reply'),seq=Number(row.info.match(/seq=(\d+)/)?.[1]||1);
  let quote:Uint8Array|undefined;
  if(!echo){
   const triggering=icmp(8,0,index===3?2:3,{identifier:1});
   quote=concat(ipv4('192.168.1.10','203.0.113.10',1,triggering.bytes.length,index===3?1:2).bytes,triggering.bytes).slice(0,row.bytes-42);
  }
  const payload=icmp(echo?reply?0:8:11,0,seq,{identifier:1,quote});
  const ttl=Number(row.info.match(/ttl=(\d+)/)?.[1]||(row.src==='192.168.1.10'?128:64));
  return frame([ethernet(row.dst==='192.168.1.10'),ipv4(row.src,row.dst,1,payload.bytes.length,ttl),payload]);
 }
 private tcp(row:CaptureRow,index:number){
  const [clientPort,service]=ports[this.id];
  const relay=this.id==='smtp'&&index>=19;
  const data=this.id==='ftp'&&(index>=12&&index<=14||index>=17&&index<=20);
  const explicit=row.info.match(/(\d+) → (\d+)/);
  const reply=row.dst==='192.168.1.10'||relay&&row.src==='198.51.100.25';
  const sport=explicit?Number(explicit[1]):data?reply?50069:52801:relay?reply?25:41522:reply?service:clientPort;
  const dport=explicit?Number(explicit[2]):data?reply?52801:50069:relay?reply?41522:25:reply?clientPort:service;
  const forward=`${row.src}:${sport}>${row.dst}:${dport}`,reverse=`${row.dst}:${dport}>${row.src}:${sport}`;
  const flagText=row.info.match(/\[([^\]]+)\]/)?.[1]||'';
  const syn=flagText.includes('SYN'),fin=flagText.includes('FIN');
  const seq=Number(row.info.match(/Seq=(\d+)/)?.[1]??this.sequence.get(forward)??1);
  const ack=Number(row.info.match(/Ack=(\d+)/)?.[1]??(syn&&!flagText.includes('ACK')?0:this.sequence.get(reverse)??1));
  const flags=syn?flagText.includes('ACK')?18:2:fin?17:row.proto==='TCP'?flagText.includes('PSH')?24:16:24;
  let options:Uint8Array|undefined;
  if(syn)options=row.bytes===74?synTimestamp:SYN_OPTIONS;
  else if(row.info.includes('SLE='))options=concat(new Uint8Array([1,1,5,10]),u32(1461),u32(2921));
  else if(relay)options=timestamps;
  const overhead=54+(options?.length||0);
  const match=row.info.match(/(\d+) segments/);
  const count=match?Number(match[1]):row.bytes>1514?Math.ceil(row.bytes/1514):1;
  let totalPayload=row.bytes-count*overhead;
  if(row.proto==='TCP'&&!/Len=/.test(row.info))totalPayload=0;
  if(row.info.includes('SLE='))totalPayload=0;
  let payload:Layer|undefined;
  if(totalPayload>0){
   if(this.id==='tls'&&index>=4&&index<=6){const start=(index-4)*MSS;payload=sliceLayer(this.flight,start,start+totalPayload)}
   else if(row.proto.startsWith('TLS')||row.proto.includes('(TLS)')){
    if(row.info.startsWith('Client Hello'))payload=tlsClientHello(totalPayload,row.info.match(/SNI=([^)]*)/)?.[1]||'www.example.com',row.kilobytes);
    else if(row.info.includes('Server Hello'))payload=serverFlight(totalPayload);
    else if(row.info.startsWith('Change Cipher Spec'))payload=tlsRecords([tls('ccs'),tls('encrypted',totalPayload-11)]);
    else payload=tls('encrypted',totalPayload-5);
   }else if(row.proto==='SSH'){
    if(row.info.includes('Encrypted'))payload=ssh('encrypted',totalPayload);
    else if(row.info.includes('SSH-2.0'))payload=plaintext(row.info,totalPayload,'SSH');
    else payload=sshCapture(row.info.includes('Key Exchange Init')?'kexinit':row.info.includes('ECDH_INIT')?'init':row.info.includes('ECDH_REPLY')?'reply':'newkeys',totalPayload);
   }else if(row.proto==='FTP-DATA'||this.id==='tcp')payload=allOpaque(row.proto==='FTP-DATA'?'File data':'TCP data',totalPayload,row.color);
   else payload=plaintext(row.info,totalPayload,row.proto);
  }
  const frames:WireFrame[]=[];
  const length=payload?.bytes.length||0;
  const mss=MSS-(options?.length||0);
  if(count>1&&length<=mss*(count-1))throw Error(`Capture segment count ${this.id} ${index}`);
  for(let n=0;n<count;n++){
   const start=n*mss,end=Math.min(length,start+mss);
   const o:TCPOptions={sport,dport,seq:seq+start,ack,flags:n===count-1?flags:flags&~8,options};
   const f=tcpFrame(row.src,row.dst,payload?sliceLayer(payload,start,end):undefined,o,reply);
   const ipLayer=f.layers[1],ttl=Number(row.info.match(/TTL (\d+)/)?.[1]||(reply?64:128));
   f.layers[1]=ipv4(row.src,row.dst,6,new DataView(ipLayer.bytes.buffer).getUint16(2)-20,ttl);f.bytes.set(f.layers[1].bytes,14);
   frames.push(f);
  }
  const result=count===1?frames[0]:aggregate(frames);
  this.sequence.set(forward,Math.max(this.sequence.get(forward)||0,seq+length+(syn||fin?1:0)));
  return result;
 }
}
