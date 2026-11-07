type Axis='x'|'y';
type Options={axis?:Axis;dir?:number;distance?:number;out?:number;inn?:number};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function curve(x:number,x1:number,y1:number,x2:number,y2:number){
 let low=0,high=1,t=x;
 for(let i=0;i<14;i++){t=(low+high)/2;const value=3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t;if(value<x)low=t;else high=t}
 return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t;
}
const easeOut=(t:number)=>curve(t,.16,1,.3,1),easeIn=(t:number)=>curve(t,.5,0,.75,0);
type Swap={phase:'out'|'in';update:()=>void;dir:number;cancelled:boolean};
const swaps=new WeakMap<HTMLElement,Swap>();
function tween(element:HTMLElement,from:{opacity:number;shift:number},to:{opacity:number;shift:number},duration:number,axis:Axis,ease:(t:number)=>number,state:Swap,done:()=>void){
 const start=performance.now();
 const tick=(now:number)=>{if(state.cancelled||!element.isConnected)return;const t=Math.min(1,Math.max(0,(now-start)/Math.max(1,duration))),fraction=ease(t);element.style.opacity=String(from.opacity+(to.opacity-from.opacity)*fraction);element.style.transform=`translate${axis.toUpperCase()}(${from.shift+(to.shift-from.shift)*fraction}px)`;if(t<1)requestAnimationFrame(tick);else done()};requestAnimationFrame(tick);
}
/** Native frame-driven UI swaps; updates queued during the exit use the newest content. */
export function slideSwap(element:HTMLElement,update:()=>void,{axis='x',dir=1,distance=24,out=160,inn=300}:Options={}){
 if(axis==='x'&&document.documentElement.dir==='rtl')dir*=-1;
 const previous=swaps.get(element);
 if(reduced()){if(previous)previous.cancelled=true;update();element.style.opacity='';element.style.transform='';swaps.delete(element);return}
 if(previous?.phase==='out'){previous.update=update;previous.dir=dir;return}
 const computed=getComputedStyle(element),opacity=Number(computed.opacity),matrix=new DOMMatrixReadOnly(computed.transform==='none'?undefined:computed.transform),shift=axis==='x'?matrix.m41:matrix.m42;
 if(previous)previous.cancelled=true;
 const state:Swap={phase:'out',update,dir,cancelled:false};swaps.set(element,state);
 const finish=()=>{if(swaps.get(element)!==state)return;element.style.opacity='';element.style.transform='';swaps.delete(element)};
 const enter=(from={opacity:0,shift:distance*state.dir},duration=inn)=>{state.phase='in';tween(element,from,{opacity:1,shift:0},duration,axis,easeOut,state,finish)};
 if(previous?.phase==='in'&&opacity<.5){state.update();enter({opacity,shift},inn*(1-opacity));return}
 tween(element,{opacity,shift},{opacity:0,shift:-distance*dir},out*opacity,axis,previous?t=>t:easeIn,state,()=>{if(swaps.get(element)!==state)return;state.update();enter()});
}
const textTargets=new WeakMap<HTMLElement,string>();
export function swapText(element:HTMLElement,text:string,dir=1){
 if(textTargets.get(element)===text)return;
 const initial=!textTargets.has(element);textTargets.set(element,text);
 if(initial){element.textContent=text;return}
 slideSwap(element,()=>{element.textContent=text},{axis:'y',dir,distance:10,out:120,inn:240});
}
const heightVersions=new WeakMap<HTMLElement,number>();
export function resizeContent(element:HTMLElement,update:()=>void){
 const from=element.getBoundingClientRect().height/Number(getComputedStyle(document.querySelector('.shell')!).zoom||1);element.style.height='';update();const to=element.offsetHeight,version=(heightVersions.get(element)||0)+1;heightVersions.set(element,version);
 if(reduced()||Math.abs(from-to)<1)return;
 const start=performance.now();element.style.height=`${from}px`;
 const tick=(now:number)=>{if(heightVersions.get(element)!==version||!element.isConnected)return;const t=Math.min(1,(now-start)/420);element.style.height=`${from+(to-from)*easeOut(t)}px`;if(t<1)requestAnimationFrame(tick);else element.style.height=''};requestAnimationFrame(tick);
}
export function resetText(element:HTMLElement,text=''){
 const current=swaps.get(element);if(current)current.cancelled=true;swaps.delete(element);textTargets.delete(element);element.style.opacity='';element.style.transform='';element.textContent=text;
}

type RowMotion={shown:boolean;cancelled:boolean};
const rowMotions=new WeakMap<HTMLElement,RowMotion>();
export function revealRow(row:HTMLElement,show:boolean,delay=0){
 const previous=rowMotions.get(row);if(previous?.shown===show)return;
 const opacity=row.hidden?0:Number(getComputedStyle(row).opacity),transform=row.hidden?'none':getComputedStyle(row).transform;
 if(previous)previous.cancelled=true;
 const state:RowMotion={shown:show,cancelled:false};rowMotions.set(row,state);
 if(reduced()||show&&opacity===1||!show&&opacity===0){row.hidden=!show;row.style.opacity='';row.style.transform='';return}
 row.hidden=false;row.style.opacity=String(opacity);if(show)row.style.transform=`translateY(${10*(1-opacity)}px)`;
 const start=performance.now()+(show&&opacity===0?delay:0),duration=show?360:180*opacity;
 const tick=(now:number)=>{if(state.cancelled||!row.isConnected)return;if(now<start){requestAnimationFrame(tick);return}const t=Math.min(1,(now-start)/duration),fraction=show?easeOut(t):t;row.style.opacity=String(opacity+((show?1:0)-opacity)*fraction);row.style.transform=show?`translateY(${10*(1-opacity)*(1-fraction)}px)`:transform;if(t<1)requestAnimationFrame(tick);else{row.hidden=!show;row.style.opacity='';row.style.transform=''}};requestAnimationFrame(tick);
}
