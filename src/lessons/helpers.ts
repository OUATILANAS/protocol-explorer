import type{PacketEvent,NodeId,Color,WireFrame,Step,Fact}from'../types';
export const addresses:Record<NodeId,string>={client:'192.168.1.10',router:'192.168.1.1',dns:'8.8.8.8',internet:'192.168.1.1',web:'203.0.113.10',root:'198.41.0.4',tld:'192.5.6.30',auth:'198.51.100.53',mx:'198.51.100.25'};
export function packet(from:NodeId,to:NodeId,color:Color,tag:string,lines:string[],time:string,proto:string,info:string,wire:()=>WireFrame):PacketEvent{const length=wire().bytes.length;return{type:'packet',from,to,color,tag,lines,row:{time,src:addresses[from],dst:addresses[to],proto,info,len:length>=1024?`${(length/1024).toFixed(1)} KB`:`${length} B`},wire}}
export const step=(title:string,desc:string,detail:string,facts:Fact[],events:Step['events']):Step=>({title,desc,detail,facts,events});
