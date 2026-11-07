import{paints,backdrop}from './network-paints';
import{tr}from'../i18n';
import type{NodeId,Frame,Scene,Lesson}from'../types';import{client}from'./devices/client';import{router}from'./devices/router';import{dns}from'./devices/dns';import{server}from'./devices/server';import{internet}from'./devices/internet';import{root}from'./devices/root';import{tld}from'./devices/tld';import{auth}from'./devices/auth';import{mx}from'./devices/mx';import{escape}from'../ui/side-panel';
export const nodes:Record<NodeId,{name:string;ip:string;x:number;y:number;art:()=>string}>={client:{name:'Client',ip:'192.168.1.10',x:225,y:310,art:client},router:{name:'Router',ip:'192.168.1.1',x:405,y:245,art:router},dns:{name:'DNS Resolver',ip:'8.8.8.8',x:525,y:150,art:dns},internet:{name:'Internet',ip:'',x:575,y:350,art:internet},web:{name:'Web Server',ip:'203.0.113.10',x:675,y:145,art:server},root:{name:'Root Server',ip:'198.41.0.4',x:370,y:80,art:root},tld:{name:'.com TLD Server',ip:'192.5.6.30',x:570,y:40,art:tld},auth:{name:'Authoritative Server',ip:'198.51.100.53',x:815,y:100,art:auth},mx:{name:'Mail Server',ip:'198.51.100.25',x:815,y:290,art:mx}};
export const frames:Record<Frame,number[]>={client:[95,135,440,300],local:[100,100,570,370],lookup:[100,15,680,450],full:[85,-5,735,455],root:[175,-65,760,470],tld:[220,-105,760,470],path:[85,-5,820,455],mailhost:[190,15,790,450]};
export {path} from './flight';
import {packetFlight,easeInOut,lanePoints} from './flight';
export function pointAlong(route:NodeId[],fraction:number){return packetFlight(route[0],route.at(-1)!).at(fraction)}
const lanes=Object.fromEntries(Object.entries(lanePoints).map(([id,[from,to]])=>[id,`M${from.x},${from.y} L${to.x},${to.y}`]));
const connections:[NodeId,NodeId][]=[['client','router'],['router','internet'],['internet','dns'],['internet','web'],['internet','root'],['internet','tld'],['internet','auth'],['internet','mx']];
export function nodeLabel(id:NodeId,lesson?:Lesson){const label=lesson?.nodeLabels?.[id];if(!label)return{name:nodes[id].name,ip:nodes[id].ip};const[name,ip='']=label.split(' / ');return{name,ip}}
const artwork:Partial<Record<NodeId,number[]>>={client:[155.13,373.5,159.35,158.5],router:[379.38,270.5,150.69,155.5],dns:[665.93,138.4,96.12,102.1],web:[762.98,133,132.68,146.6],internet:[647,394,173,120]};
const labelsAt:Partial<Record<NodeId,[number,number,number,number,string]>>={client:[73,494,190,479.3,'start'],router:[407,426,407,411.3,'start'],dns:[654,160,654,182.4,'end'],web:[773,106,772.8,128.4,'start'],internet:[726,524,765.7,509.3,'start'],root:[925,228,925,250.4,'start'],tld:[970,360,970,382.4,'start'],auth:[925,505,924.9,527.4,'start'],mx:[968,286,967.8,308.4,'start']};
function urlSvg(scene:Scene){return `<g id="url-overlay"  transform="translate(200 392) scale(1) translate(-140 -58)"><g class="url-bar ${scene.urlVisible?'is-visible':''} ${scene.urlLoaded?'is-loaded':''}"><path d="M128 26L140 58" class="url-leader"/><rect class="url-box" width="168" height="26" rx="3"/><g class="url-globe" transform="translate(9 6)"><circle cx="7" cy="7" r="6"/><ellipse cx="7" cy="7" rx="2.6" ry="6"/><path d="M1.4 5h11.2M1.4 9h11.2"/></g><text class="url-text" id="url-text" x="29" y="17.5">${escape(scene.url)}</text><path class="url-check" pathLength="1" d="M0 13.5l3.5 3.5 6.5-7"/><rect class="url-caret" x="29" y="6.5" width="1.6" height="13"/></g></g>`}
export function networkSvg(scene:Scene,lesson?:Lesson){return `<svg direction="ltr" id="network-svg" viewBox="45 66 810 490" role="img" aria-label="Network diagram"><defs>${paints}</defs>${backdrop}<g class="links">${connections.flatMap(([a,b])=>[[a,b],[b,a]] as [NodeId,NodeId][]).map(([a,b])=>`<path data-lane="${a}>${b}" d="${lanes[`${a}>${b}`]||`M${nodes[a].x},${nodes[a].y} L${nodes[b].x},${nodes[b].y}`}" marker-end="url(#head-idle)"/>`).join('')}</g><g id="packet-pulses"></g><g class="devices">${(Object.keys(nodes) as NodeId[]).sort((a,b)=>Number(b==='internet')-Number(a==='internet')).map(id=>{const n={...nodes[id],...nodeLabel(id,lesson)},target=artwork[id]||[n.x,n.y,90,120],pos=labelsAt[id]||[n.x,n.y+60,n.x,n.y+46,'start'];return `<g class="device" data-node="${id}" style="opacity:${scene.nodes.includes(id)?1:0}" stroke="none" fill="none"><g class="device-art" data-target="${target.join(',')}">${n.art()}</g><g class="node-label" data-pivot="${pos[2]},${pos[3]}" stroke="none" text-anchor="${pos[4]}"><text class="node-name" x="${pos[0]}" y="${pos[1]}" font-size="15.5" font-weight="800" fill="var(--ink-strong)">${escape(tr(n.name))}</text>${n.ip?`<text class="node-ip" x="${pos[0]}" y="${Number(pos[1])+18}" font-size="15" font-weight="500" fill="var(--k-text-1d3e9a)">${escape(n.ip)}</text>`:''}</g>${id==='client'?urlSvg(scene):''}</g>`}).join('\n')}</g><g id="scene-notes">${scene.notes.map(n=>`<g transform="translate(${nodes[n.at].x-45} ${nodes[n.at].y-105})"><text fill="var(--${n.tone})" font-size="12" font-weight="800" letter-spacing=".06em">${escape(tr(n.text))}</text></g>`).join('')}</g><path id="packet-drop" d="M-6-6l12 12M6-6-6 6" fill="none" stroke="#d6404c" stroke-width="2.6" visibility="hidden"/><g id="packet-trail" visibility="hidden">${[0,1,2].map(i=>`<circle r="${3.6-i}"/>`).join('')}</g><g id="packet-chip" visibility="hidden"><circle class="packet-halo" r="13" opacity=".18"/><circle class="packet-dot" r="6" stroke="var(--panel)" stroke-width="2"/><g id="chip-content"></g></g></svg>`}
// Preserve the label attachment point through the boot font swap. Measuring it
// at the current SVG scale also keeps narrow canvases and translated labels stable.
function anchorLabel(label:SVGGElement,bootFont:boolean){
 const origins:Partial<Record<NodeId,string>>={client:'right-top',router:'left-top',internet:'center-top',dns:'right-bottom'};
 const id=label.closest('[data-node]')!.getAttribute('data-node') as NodeId;
 const saved=label.style.fontFamily;
 if(bootFont)label.style.fontFamily='ui-monospace,monospace';
 label.removeAttribute('transform');
 const box=label.getBBox(),[horizontal,vertical]=(origins[id]||'left-bottom').split('-');
 const x=horizontal==='left'?box.x:horizontal==='right'?box.x+box.width:box.x+box.width/2;
 const y=vertical==='top'?box.y:box.y+box.height;
 label.dataset.pivot=[x,y].map(n=>n.toFixed(1)).join(',');
 label.style.fontFamily=saved;
}
export function fitNetwork(scene:Scene){
 const visible=scene.nodes.length?scene.nodes:Object.keys(nodes) as NodeId[];
 const svg=document.querySelector<SVGSVGElement>('#network-svg');if(!svg)return;
 const panel=svg.parentElement!.getBoundingClientRect();if(panel.width<=0||panel.height<=0)return;
 const requestedScale=Math.max(1,Math.min(1.8,700/panel.width));
 let scale=Number(svg.dataset.labelScale||1);
 if(Math.abs(requestedScale-scale)>=.01){
  scale=requestedScale;svg.dataset.labelScale=String(scale);
  svg.querySelectorAll<SVGGElement>('.node-label').forEach(g=>{
   anchorLabel(g,!scene.nodes.length);
   const [x,y]=g.dataset.pivot!.split(',').map(Number);
   g.setAttribute('transform',`translate(${x} ${y}) scale(${scale.toFixed(3)}) translate(${-x} ${-y})`);
  });
 }
 svg.querySelector('#url-overlay')?.setAttribute('transform',`translate(200 392) scale(${(1+(scale-1)*.6).toFixed(3)}) translate(-140 -58)`);
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 svg.querySelectorAll<SVGGElement>('.device-art').forEach(g=>{if(!visible.includes(g.closest('[data-node]')!.getAttribute('data-node') as NodeId))return;const b=g.getBBox(),{x,y,width:w,height:h}=b;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+w);y1=Math.max(y1,y+h)});
 svg.querySelectorAll<SVGGElement>('.node-label').forEach(g=>{if(!visible.includes(g.closest('[data-node]')!.getAttribute('data-node') as NodeId))return;const b=g.getBBox(),[x,y]=g.dataset.pivot!.split(',').map(Number);const fitted=Number(scale.toFixed(3));x0=Math.min(x0,x+(b.x-x)*fitted);y0=Math.min(y0,y+(b.y-y)*fitted);x1=Math.max(x1,x+(b.x+b.width-x)*fitted);y1=Math.max(y1,y+(b.y+b.height-y)*fitted)});
 if(![x0,y0,x1,y1].every(Number.isFinite))return;
 const aspect=panel.width/panel.height,w=Math.max(x1-x0+28,(y1-y0+28)*aspect),h=w/aspect;
 if(scene.frame==='client'){
  const client=svg.querySelector<SVGGElement>('[data-node="client"]')!,art=client.querySelector<SVGGElement>('.device-art')!.getBBox(),label=client.querySelector<SVGGElement>('.node-label')!,lb=label.getBBox(),lm=label.transform.baseVal.consolidate()!.matrix,url=client.querySelector<SVGGElement>('#url-overlay')!,bar=url.querySelector<SVGGElement>('.url-bar')!,ub=bar.getBBox(),um=url.transform.baseVal.consolidate()!.matrix;
  const rects=[art,{x:lm.a*lb.x+lm.e,y:lm.d*lb.y+lm.f,width:lm.a*lb.width,height:lm.d*lb.height},{x:um.a*(ub.x+ub.width*.83*.2)+um.e,y:um.d*(ub.y+ub.height*.2)+um.f,width:um.a*ub.width*.8,height:um.d*ub.height*.8}],left=Math.min(...rects.map(r=>r.x)),top=Math.min(...rects.map(r=>r.y)),right=Math.max(...rects.map(r=>r.x+r.width)),bottom=Math.max(...rects.map(r=>r.y+r.height)),width=Math.max(right-left+28,(bottom-top+28)*aspect,470),height=width/aspect;
  frames.client=[(left+right-width)/2,(top+bottom-height)/2,width,height];
 }else frames[scene.frame]=[(x0+x1-w)/2,(y0+y1-h)/2,w,h];
}

export class Camera{current=[...frames.full];target=[...frames.full];from=[...frames.full];elapsed=1000;set(frame:Frame,instant=false){const next=frames[frame];if(next.every((n,i)=>n===this.target[i]))return;this.from=[...this.current];this.target=[...next];this.elapsed=instant?1100:0;if(instant){this.current=[...next];this.from=[...next]}}tick(dt:number,reduced:boolean){this.elapsed+=dt;const t=reduced?1:Math.min(1,this.elapsed/1100),ease=easeInOut(t);this.current=t>=1?[...this.target]:this.from.map((n,i)=>n+(this.target[i]-n)*ease);document.querySelector('#network-svg')?.setAttribute('viewBox',this.current.map(n=>n.toFixed(2)).join(' '))}}
