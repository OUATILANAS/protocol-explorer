import{comparison}from'../learning/compare';
import{escape}from'./side-panel';import{tr}from'../i18n';import type{Lesson,LessonId}from'../types';
let selection:LessonId[]=['http','https','quic'],version=0;
const text=(x:number,y:number,value:string,extra='')=>'<text x="'+x+'" y="'+y+'" '+extra+'>'+escape(value)+'</text>';
export async function renderCompare(lessons:Lesson[],prepare:(id:LessonId)=>Promise<Lesson>,close:()=>void){
 const revision=++version;let host=document.querySelector<HTMLElement>('.compare-view');
 if(!host){host=document.createElement('section');host.className='compare-view';host.setAttribute('aria-label',tr('Compare lessons'));document.querySelector('.simulation')!.append(host)}
 host.hidden=false;await Promise.all(selection.map(prepare));if(revision!==version||host.hidden)return;
 const data=selection.map(id=>comparison(lessons.find(l=>l.id===id)!)),end=Math.max(1,...data.flatMap(d=>[d.request||0,d.firstByte||0,...d.phases.map(p=>p.end)])),max=Math.ceil(end/20)*20,height=130+data.length*95,x=(n:number)=>100+n/max*640;
 const axis=Array.from({length:7},(_,i)=>max*i/6);
 host.innerHTML='<div class="compare-heading">'+escape(tr('Time from first packet · original capture timing'))+'</div><svg viewBox="0 0 800 '+height+'" role="img" aria-label="'+escape(tr('Lesson timing comparison'))+'">'+axis.map(t=>'<line x1="'+x(t)+'" x2="'+x(t)+'" y1="30" y2="'+(height-45)+'" stroke="var(--line-soft)"/>'+text(x(t),height-20,Number(t.toFixed(1))+' ms','text-anchor="middle"')).join('')+data.map((d,i)=>{
  const y=65+i*95;
  return text(10,y+5,d.name,'class="compare-name"')+d.phases.map(p=>'<rect x="'+x(p.start)+'" y="'+(y-15)+'" width="'+Math.max(2,x(p.end)-x(p.start))+'" height="28" fill="var(--'+p.color+')" fill-opacity=".16" stroke="var(--'+p.color+')"/>'+text(x(p.start)+5,y+3,tr(p.name))).join('')+
   (d.request===null?'':'<path d="M'+x(d.request)+' '+(y-30)+'v55" stroke="var(--amber)" stroke-width="2"/>'+text(x(d.request)+4,y-34,'GET '+Number(d.request.toFixed(1))+' ms','style="fill:var(--upgrade-amber-ink)"'))+
   (d.firstByte===null?'':'<path d="M'+(x(d.firstByte)-4)+' '+(y+24)+'l4-7 4 7Z" fill="var(--green)"/>'+text(x(d.firstByte)+6,y+30,Number(d.firstByte.toFixed(1))+' ms','style="fill:var(--green)"'));
 }).join('')+'</svg>';
 const side=document.querySelector<HTMLElement>('#side-panel')!;
 const facts=[['Round trips before GET',data.map(d=>d.roundTrips).join(' · ')],['GET sent',data.map(d=>d.request===null?'—':Number(d.request.toFixed(1))+' ms').join(' · ')],['First byte',data.map(d=>d.firstByte===null?'—':Number(d.firstByte.toFixed(1))+' ms').join(' · ')],['Encrypted',data.map(d=>tr(d.encrypted?'Yes':'No')).join(' · ')],['Packets',data.map(d=>d.packets).join(' · ')]];
 side.innerHTML='<div class="panel-head"><h2 class="panel-title sm">'+escape(tr('Comparison'))+'</h2><button class="btn icon-btn" data-compare-close aria-label="'+escape(tr('Close comparison'))+'">×</button></div><div class="side-body compare-side"><h3>'+escape(tr('Pick 2–3 lessons'))+'</h3><div class="compare-picks">'+selection.map(id=>'<button class="btn" data-compare-remove="'+id+'" '+(selection.length<=2?'disabled':'')+'>'+escape(lessons.find(l=>l.id===id)!.name)+' ×</button>').join('')+'</div><label>'+escape(tr('Add lesson'))+'<select data-compare-add aria-label="'+escape(tr('Add lesson'))+'" '+(selection.length>=3?'disabled':'')+'><option value="">+</option>'+lessons.filter(l=>!selection.includes(l.id)).map(l=>'<option value="'+l.id+'">'+escape(l.name)+'</option>').join('')+'</select></label><dl class="facts">'+facts.map(([a,b])=>'<div class="fact"><dt>'+escape(tr(a))+'</dt><dd>'+escape(b)+'</dd></div>').join('')+'</dl><p class="description">'+escape(takeaway(data[0],data.at(-1)!))+'</p></div>';
 side.querySelector('[data-compare-close]')!.addEventListener('click',close);
 side.querySelectorAll<HTMLElement>('[data-compare-remove]').forEach(button=>button.onclick=()=>{selection=selection.filter(id=>id!==button.dataset.compareRemove);void renderCompare(lessons,prepare,close)});
 side.querySelector<HTMLSelectElement>('[data-compare-add]')!.onchange=e=>{const id=(e.target as HTMLSelectElement).value as LessonId;if(id&&selection.length<3&&!selection.includes(id)){selection.push(id);void renderCompare(lessons,prepare,close)}};
}
export function hideCompare(){version++;const host=document.querySelector<HTMLElement>('.compare-view');if(host)host.hidden=true}

function takeaway(a:ReturnType<typeof comparison>,b:ReturnType<typeof comparison>){if(a.request===null||b.request===null)return tr('Choose web lessons to compare their request timing.');const delta=Math.abs(a.request-b.request);if(!delta)return tr('Both lessons send the request at the same capture time.');const early=a.request<=b.request?a:b,late=early===a?b:a;return tr('{a} sends its request {n} ms sooner than {b}.').replace('{a}',early.name).replace('{b}',late.name).replace('{n}',String(Number(delta.toFixed(3))))+' '+tr(early.id==='quic'?'QUIC combines transport and encryption negotiation.':early.id==='http'?'HTTP has no encryption handshake.':'Their recorded setup exchanges take different amounts of time.')}
