import data from './capture-data.json';
import type {Color,LessonId,NodeId} from '../types';
export interface CaptureRow{time:string;src:string;dst:string;proto:string;info:string;color:Color;lost:boolean;bytes:number;kilobytes:boolean}
export interface CaptureDefinition{id:LessonId;name:string;fullName:string;title:string;nodes:Partial<Record<NodeId,string>>;legend:{color:Color|null;label:string}[];packets:CaptureRow[]}
export const captures=data as CaptureDefinition[];
const range=(start:number,end:number)=>Array.from({length:end-start+1},(_,i)=>start+i);
/** Packet assignment is explicit: teaching prose and step order remain authored separately. */
export const stepPackets:Partial<Record<LessonId,number[][]>>={
 http:[[],[0,1],[2,3,4],[5,6],[]],
 https:[[],[0,1],[2,3,4],[5,6,7],[8,9,10],[]],
 tcp:[[0,1,2],[3,4],[5,6],[7],[8,9],[10]],
 udp:[[0],range(1,5),[6,7],[8,9,10],[]],
 ip:[[],[0,1],[2],[3],[4]],
 dns:[[0],[1,2],[3,4],[5,6],[7]],
 dhcp:[[],[0],[1],[2],[3],[4]],
 icmp:[[0],[1],[2,3],[4,5],[6,7],[8]],
 smtp:[range(0,5),range(6,10),range(11,14),range(15,18),range(19,30),[]],
 pop3:[range(0,5),range(6,10),range(11,14),[15,16],[17]],
 imap:[range(0,6),[7,8],[9,10],[11,12],[13]],
 ftp:[range(0,3),range(4,7),range(8,11),range(12,16),range(17,21),[22]],
 ssh:[range(0,4),[5,6],range(7,10),range(11,18),[19,20],[21]],
 tls:[range(0,3),[4],[5,6],[7],[8,9,10],[11]]
};
export function nodeFor(address:string,definition:CaptureDefinition):NodeId{
 if(address==='0.0.0.0'||address==='00:00:5e:00:53:10')return'client';
 if(address==='Broadcast'||address==='255.255.255.255'||address==='00:00:5e:00:53:01'||address==='198.51.100.7')return'router';
 const match=Object.entries(definition.nodes).find(([,label])=>label?.split(' / ')[1]?.split(' · ')[0]===address);
 return match?match[0] as NodeId:'internet';
}
