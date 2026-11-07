import{http}from'./http';import{packet,addresses as a}from'./helpers';import{dns}from'../wire/dns';import{tcpFrame,udpFrame,aggregate}from'../wire';import{SYN_OPTIONS}from'../wire/tcp';import{text}from'../wire/text';import{MSS}from'../wire/common';
const query=packet('client','dns','blue','DNS QUERY',['A www.example.com'],'0.000','DNS','Standard query A www.example.com',()=>udpFrame(a.client,a.dns,59321,53,dns()));
const reply=packet('dns','client','blue','DNS REPLY',['A 203.0.113.10'],'0.012','DNS','Standard query response A 203.0.113.10',()=>udpFrame(a.dns,a.client,53,59321,dns(true),true));
export function tcpHandshake({dst='web',sport=52344,dport=80,t=['0.024','0.041','0.058']}:{dst?:'web'|'mx';sport?:number;dport?:number;t?:string[]}){return [packet('client',dst,'green','SYN',[`${sport} → ${dport} · Seq=0`],t[0],'TCP',`${sport} → ${dport} [SYN] Seq=0`,()=>tcpFrame(a.client,a[dst],undefined,{sport,dport,seq:0,ack:0,flags:2,options:SYN_OPTIONS})),packet(dst,'client','green','SYN-ACK',[`${dport} → ${sport} · Ack=1`],t[1],'TCP',`${dport} → ${sport} [SYN, ACK] Seq=0 Ack=1`,()=>tcpFrame(a[dst],a.client,undefined,{sport:dport,dport:sport,seq:0,ack:1,flags:18,options:SYN_OPTIONS},true)),packet('client',dst,'green','ACK',['Seq=1 · Ack=1'],t[2],'TCP',`${sport} → ${dport} [ACK] Seq=1 Ack=1`,()=>tcpFrame(a.client,a[dst],undefined,{sport,dport,seq:1,ack:1,flags:16}))]}
const prefix='GET / HTTP/1.1\r\nHost: www.example.com\r\nUser-Agent: ProtocolExplorer/1.0\r\nAccept: text/html\r\nAccept-Language: en\r\nConnection: keep-alive\r\nX-Lesson: ';
const request=prefix+'x'.repeat(430-new TextEncoder().encode(prefix+'\r\n\r\n').length)+'\r\n\r\n';
const responseHeader=(n:number)=>`HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${n}\r\nConnection: keep-alive\r\n\r\n`;
// Nine TCP frames include 486 bytes of Ethernet/IPv4/TCP headers.
// The remaining 12,621 bytes contain an HTTP header and an exactly sized HTML body.
let bodyLength=12621-responseHeader(0).length;
for(let i=0;i<3;i++)bodyLength=12621-responseHeader(bodyLength).length;
const htmlPrefix='<!doctype html><html lang="en"><head><title>Example page</title></head><body><h1>Hello, network!</h1><p>This page arrived in TCP segments.</p><!--';
const htmlSuffix='--></body></html>';
const html=htmlPrefix+'.'.repeat(bodyLength-htmlPrefix.length-htmlSuffix.length)+htmlSuffix;
const response=responseHeader(bodyLength)+html;
const responseWire=()=>{const frames=[];for(let offset=0;offset<response.length;offset+=MSS){frames.push(tcpFrame(a.web,a.client,text('HTTP',response.slice(offset,offset+MSS),'violet'),{sport:80,dport:52344,seq:1+offset,ack:431,flags:offset+MSS>=response.length?24:16},true))}return aggregate(frames)};
http.playback={packetGap:650,stepGap:650,urlHold:400,characterTime:80};
http.steps[0].events=[{type:'wait',duration:260},{type:'camera',frame:'client'},{type:'wait',duration:1840},{type:'type-url',text:'www.example.com'},{type:'wait',duration:1080},{type:'hide-url'},{type:'show',nodes:['router'],frame:'local'},{type:'wait',duration:2000}];
http.steps[1].events=[{type:'show',nodes:['router','internet','dns'],frame:'lookup'},{type:'wait',duration:2200},query,reply];
http.steps[2].events=[{type:'show',nodes:['web'],frame:'full'},{type:'wait',duration:1950},...tcpHandshake({})];
http.steps[3].events=[packet('client','web','amber','GET /',['GET / HTTP/1.1'],'0.058','HTTP','GET / HTTP/1.1',()=>tcpFrame(a.client,a.web,text('HTTP',request),{seq:1,ack:1,flags:24})),packet('web','client','violet','200 OK',['text/html · 9 segments'],'0.076','HTTP','HTTP/1.1 200 OK (text/html), 9 segments',responseWire)];
http.steps[4].events=[{type:'camera',frame:'client'},{type:'loaded-url',text:'www.example.com'},{type:'wait',duration:3000}];
export{http};
