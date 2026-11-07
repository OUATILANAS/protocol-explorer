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
export const nodeAnchors:Record<NodeId,Point>={client:{x:214,y:446},dns:{x:701,y:180},router:{x:440,y:360},internet:{x:732,y:458},web:{x:812,y:206},root:{x:960,y:296},tld:{x:1005,y:426},auth:{x:960,y:571},mx:{x:1010,y:378}};
export function path(from:NodeId,to:NodeId):NodeId[]{
 const chain=(id:NodeId):NodeId[]=>id==='client'?['client','router','internet']:id==='router'?['router','internet']:id==='internet'?['internet']:[id,'internet'];
 const left=chain(from),right=chain(to),junction=left.find(id=>right.includes(id))!;
 return [...left.slice(0,left.indexOf(junction)+1),...right.slice(0,right.indexOf(junction)).reverse()];
}
export const easeInOut=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
export function flight(route:NodeId[],fallback:(id:NodeId)=>Point){
 const legs=route.slice(1).map((to,i)=>lanePoints[`${route[i]}>${to}`]||[fallback(route[i]),fallback(to)]);
 const durations=legs.map(([a,b])=>Math.hypot(b.x-a.x,b.y-a.y)*5);
 const duration=durations.reduce((a,b)=>a+b,0)+Math.max(0,legs.length-1)*140+450;
 return {duration,at(fraction:number){
  let elapsed=Math.max(0,Math.min(1,fraction))*duration;const finalFade=Math.max(0,(elapsed-(duration-190))/190);const place=(a:Point,b:Point,t:number,visible=true)=>{const length=Math.hypot(b.x-a.x,b.y-a.y);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,scale,finalFade,trail:visible?[10,20,30].map(offset=>{const progress=Math.max(0,t-offset/length);return{x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress}}):[]}};
  const popIn=1-Math.exp(-Math.pow(elapsed/60,1.7))+.055*Math.exp(-Math.pow((elapsed-145)/45,2));
  const popOut=1-Math.pow(Math.max(0,(elapsed-(duration-190))/190),3);
  const scale=Math.max(0,Math.min(popIn,popOut));
  elapsed-=260;
  for(let i=0;i<legs.length;i++){
   const [a,b]=legs[i],time=durations[i];
   if(elapsed<=time){const t=Math.max(0,elapsed/time);return place(a,b,t,elapsed>=0)}
   elapsed-=time;
   if(i<legs.length-1){if(elapsed<=140){return place(a,b,1)}elapsed-=140}
  }
  return legs.length?place(legs.at(-1)![0],legs.at(-1)![1],1):{...fallback(route[0]),scale,finalFade,trail:[]};
 }};
}
export const networkPoint=(id:NodeId):Point=>({client:{x:262,y:430},router:{x:450,y:360},internet:{x:730,y:445},dns:{x:700,y:230},web:{x:790,y:260},root:{x:925,y:280},tld:{x:970,y:420},auth:{x:925,y:570},mx:{x:968,y:370}}[id]);
export const packetFlight=(from:NodeId,to:NodeId)=>flight(path(from,to),networkPoint);
