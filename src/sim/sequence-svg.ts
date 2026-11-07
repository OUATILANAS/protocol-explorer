import {tr} from '../i18n';
import type {Scene,Lesson,NodeId,PacketEvent} from '../types';
import {nodeLabel} from './network-svg';
import {isPacket} from '../types';
import {escape} from '../ui/side-panel';

/** Capture time is independent from pedagogical playback time. */
export function latencyMs(packet:PacketEvent,all:PacketEvent[]){
 const i=all.indexOf(packet),time=Number(packet.row.time);
 const reverse=(p:PacketEvent)=>p.from===packet.to&&p.to===packet.from;
 const next=all.slice(i+1).find(p=>reverse(p)&&Number(p.row.time)>time);
 if(next){const ms=(Number(next.row.time)-time)*1000;if(ms<=200)return ms}
 const previous=all.slice(0,i).reverse().find(p=>reverse(p)&&Number(p.row.time)<time);
 if(previous){const ms=(time-Number(previous.row.time))*1000;if(ms<=200)return ms}
 return packet.row.proto==='DNS'?12:17;
}
export function sequenceSvg(scene:Scene,lesson:Lesson,width=829){
 width=Math.max(480,width);
 const participants=new Set([...scene.packets,...(scene.active?[scene.active]:[])].flatMap(p=>[p.from,p.to]));
 const ids=scene.nodes.filter(n=>!['router','internet'].includes(n)||participants.has(n));
 if(!ids.includes('client'))ids.unshift('client');
 const column=(width-108)/Math.max(1,ids.length);
 const col=(id:NodeId)=>78+(Math.max(0,ids.indexOf(id))+.5)*column;
 const all=lesson.steps.flatMap(s=>s.events).filter(isPacket),shown=[...scene.packets,...(scene.active?[scene.active]:[])];
 let cursor=60,lastStep=-1,maxY=180;
 const separators:string[]=[],arrows:string[]=[];
 for(const p of shown){
  const step=lesson.steps.findIndex(s=>s.events.includes(p)),newStep=step!==lastStep;
  const y=p.sequence?60+p.sequence.at*3:cursor+(newStep&&lastStep>=0?30:0);
  const drop=(p.sequence?.latency||latencyMs(p,all))*3;
  if(newStep){const title=lesson.steps[step].title.toUpperCase();separators.push(`<g class="seq-step" data-step="${step}" transform="translate(0 ${y-15})"><line class="seq-step-line" x1="${12+(7+title.length)*5.985}" y1="0" x2="${width-10}" y2="0"/><text class="seq-step-text" x="12" y=".5"><tspan>STEP ${step+1}</tspan> · ${escape(title)}</text></g>`);lastStep=step}
  const x1=col(p.from),x2=col(p.to),fraction=scene.active===p?scene.fraction:1,lost=p.lost?.72:1;
  const endX=x1+(x2-x1)*fraction*lost,endY=y+drop*fraction*lost;
  const theta=Math.atan2(drop,x2-x1),angle=theta*180/Math.PI-(theta>Math.PI/2?180:0),ux=Math.cos(theta),uy=Math.sin(theta);
  const labelAt=p.sequence?.labelFraction||.5,mx=x1+(endX-x1)*labelAt,my=y+(endY-y)*labelAt;
  const lx=endX-9*ux,ly=endY-9*uy,current=scene.active===p;
  arrows.push(`<g class="seq-arrow c-${p.color} is-shown ${current?'is-current':''} ${p.lost?'is-lost':''}" data-geo="${x1} ${y} ${endX} ${endY} ${angle.toFixed(2)}" data-packet="${all.indexOf(p)}" role="button" tabindex="0" aria-description="Packet ${all.indexOf(p)+1}"><text class="seq-time" x="64" y="${y}">${p.row.time}s</text><circle class="seq-dot" cx="${x1}" cy="${y}" r="2.6"/><line class="seq-line" x1="${x1}" y1="${y}" x2="${lx}" y2="${ly}"/>${p.lost?`<path class="seq-cross" d="M${endX-5} ${endY-5}l10 10m-10 0 10-10"/>`:`<path class="seq-tip" d="M${endX},${endY} L${lx-uy*4.5},${ly+ux*4.5} L${lx+uy*4.5},${ly-ux*4.5} Z"/>`}<g class="seq-label" transform="translate(${mx} ${my}) rotate(${angle.toFixed(2)})"><rect class="seq-label-bg" x="${-(p.tag.length*6.325+10)/2}" width="${p.tag.length*6.325+10}" y="-17" height="15" rx="2"/><text class="seq-label-text" x="0" y="-6" text-anchor="middle">${escape(p.tag)}</text></g></g>`);
  cursor=y+drop;maxY=Math.max(maxY,cursor);
 }
 const height=Math.max(220,maxY+40);
 return `<div class="seq-head"><div class="seq-head-track" style="width:${width}px">${ids.map(id=>{const label=nodeLabel(id,lesson);return `<span class="seq-who" style="left:${col(id)}px;max-width:${column-10}px"><b>${escape(tr(label.name))}</b><i>${escape(label.ip)}</i></span>`}).join('')}</div></div><div class="sequence-scroll seq-scroll"><svg class="sequence-svg seq-svg" direction="ltr" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="Sequence diagram">${ids.map(id=>`<line class="seq-life" x1="${col(id)}" y1="0" x2="${col(id)}" y2="${height}"/>`).join('')}${separators.join('')}${arrows.join('')}</svg></div>`;
}
