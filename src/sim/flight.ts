import type {NodeId} from '../types';

type Point={x:number;y:number};
// Directional lanes have separate endpoints at each device's ports.
export const lanePoints:Record<string,[Point,Point]>={
 'client>router':[{x:262,y:430},{x:371,y:383}],
 'router>client':[{x:376,y:355},{x:268,y:403}],
 'router>internet':[{x:508.4,y:357.1},{x:668.4,y:434.8}],
 'internet>router':[{x:663.6,y:444.6},{x:503.6,y:366.9}],
 'internet>dns':[{x:690,y:418},{x:690,y:231}],
 'dns>internet':[{x:712,y:229},{x:712,y:404}],
 'internet>web':[{x:776,y:418},{x:776,y:254}],
 'web>internet':[{x:797,y:264},{x:797,y:438}],
};
for(const [node,start,end] of [
 ['root',{x:799,y:432},{x:928,y:316}],['tld',{x:812,y:457},{x:968,y:440}],['auth',{x:796,y:492},{x:925,y:580}],['mx',{x:812,y:455},{x:956,y:395}],
] as [NodeId,Point,Point][]){
 const length=Math.hypot(end.x-start.x,end.y-start.y),dx=-(end.y-start.y)/length*5.5,dy=(end.x-start.x)/length*5.5;
 lanePoints[`internet>${node}`]=[{x:start.x+dx,y:start.y+dy},{x:end.x+dx,y:end.y+dy}];lanePoints[`${node}>internet`]=[{x:end.x-dx,y:end.y-dy},{x:start.x-dx,y:start.y-dy}];
}
// Additional directional ports measured from the current reference diagram.
for(const [a,b,start,end] of [
 ['web','app',{x:868,y:240},{x:936,y:292}],['router','lan',{x:398,y:318},{x:356,y:262}],
 ['router','isp',{x:492,y:392},{x:548,y:428}],['isp','transit',{x:640,y:418},{x:706,y:374}],
 ['transit','hosting',{x:802,y:374},{x:836,y:410}],['hosting','app',{x:924,y:414},{x:950,y:364}],
 ['internet','remote',{x:800,y:440},{x:930,y:394}],['remote','peer',{x:1035,y:388},{x:1095,y:420}],['client','switch',{x:262,y:430},{x:421,y:356}],['switch','desktop',{x:548,y:350},{x:644,y:405}],['switch','router',{x:535,y:303},{x:670,y:230}],
] as [NodeId,NodeId,Point,Point][]){const length=Math.hypot(end.x-start.x,end.y-start.y),dx=-(end.y-start.y)/length*5.5,dy=(end.x-start.x)/length*5.5;lanePoints[`${a}>${b}`]=[{x:start.x+dx,y:start.y+dy},{x:end.x+dx,y:end.y+dy}];lanePoints[`${b}>${a}`]=[{x:end.x-dx,y:end.y-dy},{x:start.x-dx,y:start.y-dy}]}
lanePoints['internet>relay']=lanePoints['internet>dns'];lanePoints['relay>internet']=lanePoints['dns>internet'];
export const connections:[NodeId,NodeId][]=[['client','switch'],['switch','desktop'],['switch','router'],['client','router'],['router','internet'],['internet','dns'],['internet','web'],['internet','root'],['internet','tld'],['internet','auth'],['internet','mx'],['internet','relay'],['web','app'],['router','lan'],['router','isp'],['isp','transit'],['transit','hosting'],['hosting','app'],['internet','remote'],['remote','peer']];
export const nodeAnchors:Record<NodeId,Point>={switch:{x:490,y:345},desktop:{x:700,y:420},client:{x:214,y:446},dns:{x:701,y:180},router:{x:440,y:360},internet:{x:732,y:458},web:{x:812,y:206},root:{x:960,y:296},tld:{x:1005,y:426},auth:{x:960,y:571},mx:{x:1010,y:378},relay:{x:701,y:180},app:{x:985,y:303},lan:{x:330,y:212},isp:{x:595,y:451},transit:{x:755,y:351},hosting:{x:880,y:451},remote:{x:985,y:351},peer:{x:1186,y:430}};
export function path(from:NodeId,to:NodeId,allowed?:readonly NodeId[]):NodeId[]{
 if(allowed){const visible=new Set([...allowed,from,to]),queue:NodeId[][]=[[from]],seen=new Set<NodeId>([from]);while(queue.length){const route=queue.shift()!,last=route.at(-1)!;if(last===to)return route;for(const[a,b]of connections){const next=a===last?b:b===last?a:null;if(next&&visible.has(next)&&!seen.has(next)){seen.add(next);queue.push([...route,next])}}}}

 const chain=(id:NodeId):NodeId[]=>id==='client'?['client','router','internet']:id==='router'?['router','internet']:id==='internet'?['internet']:[id,'internet'];
 const left=chain(from),right=chain(to),junction=left.find(id=>right.includes(id))!;
 return [...left.slice(0,left.indexOf(junction)+1),...right.slice(0,right.indexOf(junction)).reverse()];
}
export const easeInOut=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
export function flight(route:NodeId[],fallback:(id:NodeId)=>Point){
 const legs=route.slice(1).map((to,i)=>lanePoints[`${route[i]}>${to}`]||[fallback(route[i]),fallback(to)]);
 const durations=legs.map(([a,b])=>Math.hypot(b.x-a.x,b.y-a.y)/.21);
 const duration=durations.reduce((a,b)=>a+b,0)+Math.max(0,legs.length-1)*140+550;
 return {duration,at(fraction:number){
  let elapsed=Math.max(0,Math.min(1,fraction))*duration;const finalFade=Math.min(1,Math.max(0,(elapsed-(duration-330))/180));const place=(a:Point,b:Point,t:number,visible=true)=>{const length=Math.hypot(b.x-a.x,b.y-a.y);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,scale,finalFade,trail:visible?[10,20,30].map(offset=>{const progress=Math.max(0,t-offset/length);return{x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress}}):[]}};
  const pop=Math.min(1,elapsed/220),popIn=1+2.2*Math.pow(pop-1,3)+1.2*Math.pow(pop-1,2);
  const popOut=1-Math.pow(finalFade,3);
  const scale=Math.max(0,finalFade>0?popOut:popIn);
  elapsed-=220;
  for(let i=0;i<legs.length;i++){
   const [a,b]=legs[i],time=durations[i];
   if(elapsed<=time){const t=Math.max(0,elapsed/time);return place(a,b,t,elapsed>=0)}
   elapsed-=time;
   if(i<legs.length-1){if(elapsed<=140){return place(a,b,1)}elapsed-=140}
  }
  return legs.length?place(legs.at(-1)![0],legs.at(-1)![1],1):{...fallback(route[0]),scale,finalFade,trail:[]};
 }};
}
const legacyPoints:Partial<Record<NodeId,Point>>={client:{x:262,y:430},router:{x:450,y:360},internet:{x:730,y:445},dns:{x:700,y:230},web:{x:790,y:260},root:{x:925,y:280},tld:{x:970,y:420},auth:{x:925,y:570},mx:{x:968,y:370}};
export const networkPoint=(id:NodeId):Point=>legacyPoints[id]||nodeAnchors[id];
export const packetFlight=(from:NodeId,to:NodeId,allowed?:readonly NodeId[])=>flight(path(from,to,allowed),networkPoint);
