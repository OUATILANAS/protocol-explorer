// Convert measured technical field values into reusable encoder inputs. Prose is excluded.
import{readFile,writeFile,mkdir}from'node:fs/promises';
const source=JSON.parse(await readFile('qa/upgrade/reference-33-technical.json'));
const colors={eth:'slate',wlan:'slate',arp:'amber',ip:'blue',ip6:'blue',tcp:'green',udp:'green',icmp:'amber',icmp6:'amber',tls:'teal',pad:'slate',llc:'slate',eapol:'amber',eap:'amber',ccmp:'teal',wg:'teal',esp:'teal',ike:'amber',quic:'teal',radius:'violet',smb:'violet',modbus:'violet',bgp:'violet',stun:'amber',dtls:'teal',srtp:'teal'};
function parts(bytes,fields,id){
 const cuts=new Set([0,bytes.length]);for(const f of fields){if(f.from>=0&&f.from<=bytes.length)cuts.add(f.from);if(f.to>=0&&f.to<=bytes.length)cuts.add(f.to)}
 const ordered=[...cuts].sort((a,b)=>a-b),out=[];
 for(let i=0;i<ordered.length-1;i++){
  const start=ordered[i],end=ordered[i+1],b=bytes.slice(start,end),f=fields.find(f=>f.from===start&&f.to===end);
  if(!b.length)continue;
  if(b.some(n=>n===null)){let p=0;while(p<b.length){const hidden=b[p]===null;let q=p+1;while(q<b.length&&(b[q]===null)===hidden)q++;out.push(hidden?['opaque',q-p]:['hex',b.slice(p,q).map(n=>n.toString(16).padStart(2,'0')).join('')]);p=q}continue}
  const checksum=(id==='ip'&&start===10)||(id==='tcp'&&start===16)||(id==='udp'&&start===6)||(['icmp','icmp6'].includes(id)&&start===2);
  if(checksum){out.push(['uint',b.length,'0']);continue}
  if(f&&b.length===4&&/^\d+\.\d+\.\d+\.\d+$/.test(f.value)){out.push(['ipv4',f.value]);continue}
  if(f&&b.length===6&&/^(?:[\da-f]{2}:){5}[\da-f]{2}$/i.test(f.value)){out.push(['mac',f.value]);continue}
  if(f&&['ip6','icmp6'].includes(id)&&b.length===16&&f.value.includes(':')&&/^[\da-f:]+$/i.test(f.value)){out.push(['ipv6',f.value]);continue}
  if(b.length<=8){out.push(['uint',b.length,b.reduce((n,v)=>(n<<8n)|BigInt(v),0n).toString()]);continue}
  if(b.every(n=>n===9||n===10||n===13||n>=32&&n<127)){out.push(['text',String.fromCharCode(...b)]);continue}
  out.push(['hex',b.map(n=>n.toString(16).padStart(2,'0')).join('')]);
 }return out;
}
function layerRecipe(id,name,bytes,fields){
 const normalized=fields.map(f=>({name:f.name,value:String(f.value),inlineNote:!!f.note,offset:f.from,length:f.to-f.from,...(f.example?{eg:true}:{}),...(f.depth?{depth:f.depth}:{})}));
 return{id,name:name.replace(/ · \d+ bytes$/,''),color:colors[id]||'violet',parts:parts(bytes,fields,id),fields:normalized};
}
const targets=[];await mkdir('src/lessons/reference-models',{recursive:true});
for(const lesson of source.lessons){
 const events=lesson.steps.flatMap(s=>s.events.flatMap(e=>e.type==='stream'?e.packets:e.type==='packet'?[e]:[]));
 const recipes=events.map((e,index)=>{
  const measured=source.oracle[lesson.id][index],payload=source.payloads[lesson.id][index];
  const layers=measured.layers.filter(l=>l.id!=='pad').map(l=>{
   const full=payload&&l.id===payload.id;
   const bytes=full?payload.bytes:measured.bytes.slice(l.from,l.to);
   const fields=full?payload.fields:measured.fields.filter(f=>f.layer===l.id).map(f=>({...f,from:f.from-l.from,to:f.to-l.from}));
   return layerRecipe(l.id,l.name,bytes,fields);
  });
  return{layers,...(measured.tcp?.mss?{mss:measured.tcp.mss}:{}),...(e.row.wire?.udp?.noChecksum?{udpChecksumDisabled:true}:{})};
 });
 await writeFile(`src/lessons/reference-models/${lesson.id}.json`,JSON.stringify(recipes)+'\n');
 const catalog=source.catalog.find(c=>c.id===lesson.id);
 targets.push({id:lesson.id,name:lesson.name,title:lesson.title,fullName:lesson.overview.full,category:catalog.group,layer:lesson.layer,nodes:lesson.labels||{},legend:lesson.legend,packets:events.map(e=>({...e.row,wire:undefined,color:e.color,lost:e.lost||false})),steps:lesson.steps.map(s=>({title:s.title,desc:s.desc}))});
}
targets.sort((a,b)=>source.catalog.findIndex(c=>c.id===a.id)-source.catalog.findIndex(c=>c.id===b.id));
await writeFile('tests/fixtures/reference-33-packets.json',JSON.stringify({reference:'https://protocol-explorer-alpha.vercel.app/',capturedAt:'2026-11-07',lessons:targets},null,2)+'\n');
// Retain the technical lesson definitions, but not the reference’s field explanations or byte oracle.
const technical={catalog:source.catalog,lessons:source.lessons};
await writeFile('qa/upgrade/reference-33-technical.json',JSON.stringify(technical,null,2)+'\n');
console.log(`Generated ${targets.length} declarative encoder recipes: ${targets.reduce((n,l)=>n+l.packets.length,0)} packets.`);
