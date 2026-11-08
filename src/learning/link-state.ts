import type{PacketEvent}from'../types';
export interface MacEntry{mac:string;port:number;age:number;expired:boolean;prior:boolean}
const ports:Record<string,number>={'00:00:5e:00:53:10':1,'00:00:5e:00:53:20':2,'00:00:5e:00:53:01':8};
export function macTable(packets:PacketEvent[],afterIdle=false):MacEntry[]{
 const latest=Math.max(0,...packets.map(p=>Number(p.row.time))),seen=new Map<string,number>();
 for(const packet of packets){const ethernet=packet.wire().layers.find(l=>l.name==='Ethernet II');if(!ethernet)continue;const mac=Array.from(ethernet.bytes.slice(6,12),n=>n.toString(16).padStart(2,'0')).join(':');if(ports[mac])seen.set(mac,Number(packet.row.time))}
 return Object.entries(ports).map(([mac,port])=>({mac,port,prior:port===8,age:afterIdle?300:Math.max(0,latest-(seen.get(mac)??latest)),expired:port!==8&&(afterIdle||!seen.has(mac))}));
}
export function joiningStage(packets:PacketEvent[]){const info=packets.map(p=>p.row.info+' '+p.tag).join('\n');if(/CCMP|Protected Data|encrypted data/i.test(info))return 4;if(/(?:Message|Key)\s*4\b|4 of 4|4\/4/i.test(info))return 4;if(/EAPOL|4-way/i.test(info))return 3;if(/Association response|Association Response/i.test(info))return 2;if(/SAE|Authentication/i.test(info))return 1;return 0}
