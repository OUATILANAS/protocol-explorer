import type{Field,Layer,WireFrame}from'../types';
import{frame,layer,field}from'./common';
import{concat,checksum,hex,ip,u16,u32}from'./checksum';
import{aggregate}from'./index';
import{sliceLayer}from'./capture';
import{explainField}from'./field-explanations';

/** Declarative field inputs, never a prebuilt Ethernet frame. */
export type WirePart=['uint',number,string]|['little',number,string]|['text',string]|['hex',string]|['opaque',number]|['ipv4',string]|['ipv6',string]|['mac',string];
export interface RecipeField{name:string;value:string;offset:number;length:number;eg?:boolean;depth?:number}
export interface LayerRecipe{id:string;name:string;color:Layer['color'];parts:WirePart[];fields:RecipeField[]}
export interface PacketRecipe{layers:LayerRecipe[];mss?:number;udpChecksumDisabled?:boolean}
export interface RecipeOptions{mss?:number;ttl?:number}
function ipv6Address(value:string){
 const halves=value.split('::');if(halves.length>2)throw Error('Invalid IPv6 address');
 const parse=(s:string)=>s?s.split(':').flatMap(p=>p.includes('.')?[...ip(p)].reduce<number[]>((out,b,i,all)=>{if(i%2===0)out.push((b<<8)|all[i+1]);return out},[]):[Number.parseInt(p,16)]):[];
 const left=parse(halves[0]),right=parse(halves[1]||'');
 const words=halves.length===2?[...left,...Array(8-left.length-right.length).fill(0),...right]:left;
 if(words.length!==8||words.some(n=>!Number.isInteger(n)||n<0||n>65535))throw Error('Invalid IPv6 address');
 return concat(...words.map(u16));
}
function partBytes(part:WirePart):Uint8Array{
 switch(part[0]){
  case'opaque':if(!Number.isSafeInteger(part[1])||part[1]<0)throw Error('Invalid opaque length');return new Uint8Array(part[1]);
  case'text':return new TextEncoder().encode(part[1]);
  case'ipv4':{const b=ip(part[1]);if(b.length!==4)throw Error('Invalid IPv4 address');return b}
  case'ipv6':return ipv6Address(part[1]);
  case'mac':case'hex':{const text=part[1].replace(/[\s:]/g,'');if(text.length%2||!/^[\da-f]*$/i.test(text))throw Error('Invalid hexadecimal field');return Uint8Array.from(text.match(/../g)||[],s=>Number.parseInt(s,16))}
  case'uint':case'little':{const size=part[1];if(!Number.isInteger(size)||size<1||size>8)throw Error('Invalid integer width');let value=BigInt(part[2]);if(value<0||value>=(1n<<BigInt(size*8)))throw Error('Integer does not fit its field');const b=new Uint8Array(size);for(let i=0;i<size;i++){b[part[0]==='little'?i:size-1-i]=Number(value&255n);value>>=8n}return b}
 }
}
export function encodeLayer(recipe:LayerRecipe):Layer{
 const parts=recipe.parts.map(partBytes),bytes=concat(...parts),opaque:number[]=[];let at=0;
 recipe.parts.forEach((p,i)=>{if(p[0]==='opaque')for(let n=0;n<parts[i].length;n++)opaque.push(at+n);at+=parts[i].length});
 const fields:Field[]=recipe.fields.map(f=>({...f,note:explainField(recipe.id,f.name,f.value)}));
 for(const f of fields)if(f.offset<0||f.length<0||f.offset+f.length>bytes.length)throw Error(`${recipe.name}: field outside its layer: ${f.name}`);
 return layer(recipe.name,recipe.color,bytes,fields,opaque.length?opaque:undefined);
}
function writeField(l:Layer,offset:number,length:number,value:string){
 const f=l.fields.find(f=>f.offset===offset&&f.length===length);if(f)f.value=value;
 if(l.opaque)l.opaque=l.opaque.filter(n=>n<offset||n>=offset+length);
}
const view=(bytes:Uint8Array)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
function correctFrame(layers:Layer[],options:RecipeOptions,udpDisabled:boolean):WireFrame{
 const ipv4=layers.find(l=>l.name==='IPv4'),ipv6=layers.find(l=>l.name==='IPv6'),network=ipv4||ipv6;
 if(network){
  const start=layers.indexOf(network),inside=layers.slice(start+1).filter(l=>l.name!=='Ethernet padding');
  const payload=concat(...inside.map(l=>l.bytes)),v=view(network.bytes);
  if(ipv4){
   v.setUint16(2,network.bytes.length+payload.length);if(options.ttl!==undefined)network.bytes[8]=Math.max(1,Math.min(255,Math.round(options.ttl)));
   v.setUint16(10,0);const sum=checksum(network.bytes);v.setUint16(10,sum);
   writeField(network,2,2,`${network.bytes.length+payload.length} bytes`);writeField(network,8,1,String(network.bytes[8]));writeField(network,10,2,hex(sum));
  }else{v.setUint16(4,payload.length);writeField(network,4,2,`${payload.length} bytes`)}
  const proto=ipv4?network.bytes[9]:network.bytes[6],transport=inside[0];
  const checksumOffset=proto===6?16:proto===17?6:proto===1||proto===58?2:-1;
  if(transport&&checksumOffset>=0){
   if(proto===17){view(transport.bytes).setUint16(4,payload.length);writeField(transport,4,2,`${payload.length} bytes`)}
   view(transport.bytes).setUint16(checksumOffset,0);
   const all=concat(...inside.map(l=>l.bytes));
   const pseudo=proto===1?new Uint8Array():ipv4?concat(network.bytes.slice(12,20),new Uint8Array([0,proto]),u16(all.length)):concat(network.bytes.slice(8,40),u32(all.length),new Uint8Array([0,0,0,proto]));
   const sum=proto===17&&udpDisabled?0:checksum(concat(pseudo,all))||(proto===17?65535:0);
   view(transport.bytes).setUint16(checksumOffset,sum);writeField(transport,checksumOffset,2,hex(sum));
  }
 }
 const bytes=concat(...layers.map(l=>l.bytes));
 if(layers[0]?.name==='Ethernet II'&&bytes.length<60){const n=60-bytes.length;layers.push(layer('Ethernet padding','slate',new Uint8Array(n),[field('Padding',`${n} zero bytes`,'Fills a short Ethernet frame to its minimum on-wire size.',0,n)]))}
 return frame(layers);
}
/** Lengths, checksums, segment boundaries and sequence increments are computed. */
export function encodeRecipe(recipe:PacketRecipe,options:RecipeOptions={}):WireFrame{
 const layers=recipe.layers.map(encodeLayer),tcp=layers.find(l=>l.name==='TCP');
 if(!tcp)return correctFrame(layers,options,recipe.udpChecksumDisabled||false);
 const network=layers.find(l=>l.name==='IPv4'||l.name==='IPv6');if(!network)throw Error('TCP needs an IP header');
 const index=layers.indexOf(tcp),application=layers.slice(index+1).filter(l=>l.name!=='Ethernet padding');
 const payload=concat(...application.map(l=>l.bytes)),base=view(tcp.bytes).getUint32(4);
 const mss=Math.min(options.mss??recipe.mss??1460,1500-network.bytes.length-tcp.bytes.length);
 if(!Number.isInteger(mss)||mss<1)throw Error('Invalid MSS');
 if(options.mss!==undefined){for(let at=20;at<tcp.bytes.length;){const kind=tcp.bytes[at];if(kind===0)break;if(kind===1){at++;continue}const n=tcp.bytes[at+1];if(n<2||at+n>tcp.bytes.length)break;if(kind===2&&n===4)view(tcp.bytes).setUint16(at+2,mss);at+=n}}
 if(payload.length<=mss)return correctFrame(layers,options,false);
 const segments:WireFrame[]=[];
 for(let offset=0;offset<payload.length;offset+=mss){
  const end=Math.min(payload.length,offset+mss),prefix=layers.slice(0,index+1).map(l=>({...l,bytes:l.bytes.slice(),fields:l.fields.map(f=>({...f})),opaque:l.opaque?.slice()}));
  const header=prefix.at(-1)!;view(header.bytes).setUint32(4,(base+offset)>>>0);if(end<payload.length)header.bytes[13]&=~8;
  writeField(header,4,4,String((base+offset)>>>0));let at=0;
  const parts=application.flatMap(l=>{const begin=at;at+=l.bytes.length;return end<=begin||offset>=at?[]:[sliceLayer(l,Math.max(0,offset-begin),Math.min(l.bytes.length,end-begin))]});
  const ip=prefix.find(l=>l.name==='IPv4');if(ip){const id=(view(ip.bytes).getUint16(4)+segments.length)&65535;view(ip.bytes).setUint16(4,id);writeField(ip,4,2,hex(id))}
  segments.push(correctFrame([...prefix,...parts],options,false));
 }
 return aggregate(segments,frame(application));
}
