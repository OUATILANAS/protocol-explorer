import type{Layer,WireFrame}from'../types';import{ethernet}from'./ethernet';import{ipv4}from'./ipv4';import{udp}from'./udp';import{tcp,type TCPOptions}from'./tcp';import{concat,checksum,hex}from'./checksum';import{frame,layer,field}from'./common';
export function udpFrame(src:string,dst:string,sport:number,dport:number,payload:Layer,reply=false){const layers=[ethernet(reply),ipv4(src,dst,17,8+payload.bytes.length,128,0xd825,src==='192.168.1.10'&&dport===53?0:0x4000),udp(src,dst,sport,dport,payload.bytes),payload];const n=layers.reduce((n,l)=>n+l.bytes.length,0);if(n<60)layers.push(layer('Ethernet padding','slate',new Uint8Array(60-n),[field('Padding',`${60-n} bytes`,'Ethernet has a minimum frame size; padding is outside the IP packet.',0,60-n)]));return frame(layers)}
export function tcpFrame(src:string,dst:string,payload?:Layer,o:TCPOptions={},reply=false):WireFrame{const data=payload?.bytes||new Uint8Array();const header=tcp(src,dst,data,o);const layers=[ethernet(reply),ipv4(src,dst,6,header.bytes.length+data.length),header,...(payload?[payload]:[])];const n=layers.reduce((n,l)=>n+l.bytes.length,0);if(n<60)layers.push(layer('Ethernet padding','slate',new Uint8Array(60-n),[field('Padding',`${60-n} bytes`,'Ethernet has a minimum frame size; padding is outside the IP packet.',0,60-n)]));return frame(layers)}
export function aggregate(frames:WireFrame[],reassembled?:WireFrame):WireFrame{
 const first=frames[0]?.layers.find(l=>l.name==='IPv4');
 const base=first?new DataView(first.bytes.buffer,first.bytes.byteOffset).getUint16(4):0;
 frames.forEach((part,index)=>{
  const ip=part.layers.find(l=>l.name==='IPv4');
  if(ip){
   const view=new DataView(ip.bytes.buffer,ip.bytes.byteOffset,ip.bytes.byteLength);
   view.setUint16(4,(base+index)&65535);view.setUint16(10,0);view.setUint16(10,checksum(ip.bytes));
   for(const f of ip.fields){if(f.name==='Identification')f.value=hex(view.getUint16(4));if(f.name==='Header checksum')f.value=hex(view.getUint16(10));if(f.name==='Total length')f.note='One segment: fits the 1,500-byte MTU.'}
   const offset=part.layers.slice(0,part.layers.indexOf(ip)).reduce((n,l)=>n+l.bytes.length,0);part.bytes.set(ip.bytes,offset);
  }
  if(index<frames.length-1){const payload=part.layers.at(-1);if(payload&&!['Ethernet padding','TCP','UDP'].includes(payload.name)){const last=payload.fields.at(-1);if(last)last.note+=` Continues in segment ${index+2}.`}}
 });
 return{bytes:concat(...frames.map(f=>f.bytes)),layers:frames.flatMap(f=>f.layers),frames,segments:frames,reassembled};
}
