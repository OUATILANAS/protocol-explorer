import{layer,field}from'./common';import{concat,u16,ip}from'./checksum';
export function dns(reply=false,name='www.example.com',type=1,answer='203.0.113.10'){const encoded=concat(...name.split('.').map(s=>concat(new Uint8Array([s.length]),new TextEncoder().encode(s))),new Uint8Array([0]));const q=concat(encoded,u16(type),u16(1));let a=new Uint8Array();if(reply){const data=type===1?ip(answer):type===15?concat(u16(10),encoded):encoded;a=concat(new Uint8Array([0xc0,0x0c]),u16(type),u16(1),new Uint8Array([0,0,1,44]),u16(data.length),data)}const b=concat(u16(0x3d1a),u16(reply?0x8180:0x0100),u16(1),u16(reply?1:0),u16(0),u16(0),q,a);return layer('DNS','violet',b,[field('Transaction ID','0x3d1a','Matches a reply to its query.',0,2,true),field('Flags',reply?'0x8180 (response, recursion available)':'0x0100 (query, recursion desired)','The client asks the resolver to complete the lookup.',2,2),field('Questions','1','One name is being looked up.',4,2),field('Answers',reply?'1':'0','Number of records in the answer section.',6,2),field('Authority records','0','No delegated authority records in this example.',8,2),field('Additional records','0','No additional records in this example.',10,2),field('Question name',name,'Length-prefixed labels followed by a zero byte.',12,encoded.length),field('Question type',`${type} (${type===1?'A':type===15?'MX':'NS'})`,'The requested DNS record kind.',12+encoded.length,2),field('Question class','1 (IN)','The Internet class.',14+encoded.length,2),...(reply?[field('Answer name','Pointer → question name','Compression reuses the earlier domain name.',12+q.length,2),field('Answer type / class',`${type} / IN`,'Type and class of the returned record.',14+q.length,4),field('TTL','300 seconds','How long this answer may be cached.',18+q.length,4),field('Record length',String(a.length-12),'Length of the resource data.',22+q.length,2),field('Answer',type===1?answer:name,'The resource data returned by the resolver.',24+q.length,a.length-12)]:[])])}

interface DNSCaptureOptions {name?:string;answer?:string;kind?:'query'|'answer'|'root-referral'|'tld-referral'|'mx';edns?:boolean;authoritative?:boolean;length?:number}
/** DNS labels and resource records use real suffix compression and EDNS padding. */
export function dnsCapture(options:DNSCaptureOptions={}){
 const name=options.name||'www.example.com',kind=options.kind||'query',reply=kind!=='query',isMx=kind==='mx';
 const bytes:number[]=Array(12).fill(0),fields:ReturnType<typeof field>[]=[],names=new Map<string,number>();
 const put=(b:Uint8Array)=>{bytes.push(...b)};
 const label=(s:string)=>{
  const labels=s.replace(/\.$/,'').split('.');
  for(let i=0;i<labels.length;i++){
   const suffix=labels.slice(i).join('.');const found=names.get(suffix);
   if(found!==undefined){put(u16(0xc000|found));return}
   names.set(suffix,bytes.length);const b=new TextEncoder().encode(labels[i]);bytes.push(b.length,...b);
  }
  bytes.push(0);
 };
 const qStart=bytes.length;label(name);put(u16(isMx?15:1));put(u16(1));
 fields.push(field('Question',`${name} · ${isMx?'MX':'A'} · IN`,'The requested name, record type and Internet class.',qStart,bytes.length-qStart));
 let answers=0,authority=0,additional=0;
 const rr=(owner:string,type:number,ttl:number,data:()=>void,description:string)=>{
  const start=bytes.length;label(owner);put(u16(type));put(u16(1));bytes.push(0,0,(ttl>>>8)&255,ttl&255);const lenAt=bytes.length;put(u16(0));const begin=bytes.length;data();const len=bytes.length-begin;bytes[lenAt]=len>>>8;bytes[lenAt+1]=len&255;
  fields.push(field(type===2?'Name server':type===15?'Mail exchanger':'Address record',description,'A typed resource record with compressed owner names and a cache lifetime.',start,bytes.length-start));
 };
 if(kind==='answer'){rr(name,1,300,()=>put(ip(options.answer||'203.0.113.10')),options.answer||'203.0.113.10');answers++}
 if(kind==='mx'){rr(name,15,300,()=>{put(u16(10));label('mx.example.org')},'10 mx.example.org');answers++}
 if(kind==='root-referral'||kind==='tld-referral'){
  const root=kind==='root-referral',owner=root?'com':'example.com';
  const servers=root?Array.from({length:13},(_,i)=>String.fromCharCode(97+i)+'.gtld-servers.net'):['ns1.example.com','ns2.example.com'];
  for(const server of servers){rr(owner,2,300,()=>label(server),server);authority++}
  for(const server of servers){rr(server,1,300,()=>put(ip(root?'192.5.6.30':'198.51.100.53')),`${server} · ${root?'192.5.6.30':'198.51.100.53'} (example glue)`);additional++}
 }
 if(options.edns||options.length&&options.length>bytes.length){
  const start=bytes.length;bytes.push(0);put(u16(41));put(u16(1232));put(new Uint8Array(4));const needed=(options.length??bytes.length+2)-(bytes.length+2);
  if(needed!==0&&needed<4)throw Error(`DNS cannot fit ${needed} EDNS bytes (${kind}, ${name}, base ${start}, target ${options.length})`);
  put(u16(Math.max(0,needed)));if(needed>0){put(u16(12));put(u16(needed-4));put(new Uint8Array(needed-4))}
  additional++;fields.push(field('EDNS',needed?'OPT · UDP 1232 · padding':'OPT · UDP 1232','EDNS extends DNS; the padding option changes message length without inventing records.',start,bytes.length-start));
 }
 const b=new Uint8Array(bytes),v=new DataView(b.buffer);v.setUint16(0,0x3d1a);v.setUint16(2,reply?options.authoritative?0x8400:kind.includes('referral')?0x8000:0x8180:0x0100);v.setUint16(4,1);v.setUint16(6,answers);v.setUint16(8,authority);v.setUint16(10,additional);
 fields.unshift(field('Transaction ID','0x3d1a','Matches this response with its question.',0,2,true),field('Flags',`0x${v.getUint16(2).toString(16).padStart(4,'0')}`,'Query/response, recursion and authoritative flags.',2,2),field('Questions','1','One resource question.',4,2),field('Answers',String(answers),'Records in the answer section.',6,2),field('Authority records',String(authority),'Name servers for a delegated zone.',8,2),field('Additional records',String(additional),'Glue address records and optional EDNS settings.',10,2));
 if(options.length!==undefined&&b.length!==options.length)throw Error(`DNS length ${b.length}, expected ${options.length} (${kind})`);
 return layer('DNS','violet',b,fields);
}
