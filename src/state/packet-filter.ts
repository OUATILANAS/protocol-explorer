import type{PacketEvent}from'../types';
export interface ParsedFilter{valid:boolean;error:string;matches:(packet:PacketEvent)=>boolean}
export function parsePacketFilter(input:string):ParsedFilter{
 const value=input.trim();if(!value)return{valid:true,error:'',matches:()=>true};
 const invalid=():ParsedFilter=>({valid:false,error:'Use proto==tcp, ip==8.8.8.8, src==, dst== or len>100; join expressions with &&.',matches:()=>true});
 if(!/[=<>]|&&/.test(value)){const query=value.toLocaleLowerCase();return{valid:true,error:'',matches:p=>Object.values(p.row).join(' ').toLocaleLowerCase().includes(query)}}
 const predicates:((p:PacketEvent)=>boolean)[]=[];
 for(const part of value.split('&&')){const numeric=/^len\s*(>=|<=|>|<)\s*(\d+(?:\.\d+)?)$/i.exec(part.trim());if(numeric){const n=Number(numeric[2]),operator=numeric[1];predicates.push(p=>{const length=p.wire().bytes.length;return operator==='>'?length>n:operator==='<'?length<n:operator==='>='?length>=n:length<=n});continue}
  const text=/^(proto|ip|src|dst)\s*==\s*([^=<>\s&]+)$/i.exec(part.trim());if(!text)return invalid();const key=text[1].toLowerCase(),target=text[2].toLowerCase();predicates.push(p=>{const r=p.row;if(key==='proto')return r.proto.toLowerCase()===target;if(key==='ip')return[r.src,r.dst].some(v=>v.toLowerCase()===target);return r[key as 'src'|'dst'].toLowerCase()===target});
 }
 return{valid:true,error:'',matches:p=>predicates.every(fn=>fn(p))};
}
