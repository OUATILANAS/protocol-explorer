import{targetEl}from'../state/event-target';
import{tr,t}from'../i18n';
import type{PacketEvent,WireFrame}from'../types';
import{escape}from'./side-panel';
function fieldNote(note:string){
 const continuation=note.match(/^(.*) Continues in segment (\d+)\.$/s),original=continuation?continuation[1]:note;
 const translated=original==='One segment: fits the 1,500-byte MTU.'?t('mtuSegmentNote'):tr(original);
 return continuation?`${translated} ${t('continuesInSegment').replace('{n}',continuation[2])}`:translated;
}
function layerSummary(l:WireFrame['layers'][number]){
 const value=(name:string)=>l.fields.find(f=>f.name===name)?.value||'';
 if(l.name==='Ethernet II'||l.name==='IPv4'||l.name==='IPv6')return `${value('Source')} → ${value('Destination')}`;
 if(l.name==='UDP'||l.name==='TCP')return `${value('Source port')} → ${value('Destination port')}`;
 return '';
}
export function inspector(p:PacketEvent,index:number,total:number,frameIndex=0){
 const all=p.wire(),parts=all.segments||all.frames;
 const selected=parts?Math.max(0,Math.min(frameIndex,parts.length-(all.reassembled?0:1))):0;
 const reassembled=Boolean(parts&&all.reassembled&&selected===parts.length);
 const w=reassembled?all.reassembled!:parts?.[selected]||all;
 const streamName=all.reassembled?.layers.some(l=>/TLS/i.test(l.name))?'TLS':all.reassembled?.layers.map(l=>l.name).join(' + ')||p.row.proto;
 const byteCount=(n:number)=>n.toLocaleString('en-US');
 let offset=0,fieldId=0;
 const layers=w.layers.map((l,i)=>{const item={...l,offset,index:i};offset+=l.bytes.length;return item});
 const fields=layers.flatMap(l=>l.fields.map(f=>({...f,offset:l.offset+f.offset,id:fieldId++,color:l.color})));
 const byteOwner=(o:number)=>fields.find(f=>o>=f.offset&&o<f.offset+f.length)?.id??-1;
 const byteLayer=(o:number)=>layers.find(l=>o>=l.offset&&o<l.offset+l.bytes.length)!;
 const opaque=(o:number)=>{const l=byteLayer(o);return l.opaque?.includes(o-l.offset)};
 const fieldAttrs=(o:number)=>`data-offset="${o}" data-owner="${byteOwner(o)}"`;
 return `<section class="inspector ${parts?'has-segments':''}" role="dialog" aria-modal="true" aria-labelledby="inspector-title" data-index="${index}">
 <div class="ins-head"><span class="ins-badge number-dot ${p.color}">${index+1}</span><div class="ins-title"><b id="inspector-title">${escape(p.tag)}</b><span dir="ltr">${p.row.time}s · ${p.row.src} → ${p.row.dst} · ${p.row.proto} · ${p.row.len}</span></div><div class="ins-nav"><button data-action="prev-packet" aria-label="Previous packet" title="Previous packet (←)">‹</button><button data-action="next-packet" aria-label="Next packet" title="Next packet (→)">›</button><button data-action="close" aria-label="Close" title="Close (Esc)">✕</button></div></div>
 <div class="ins-where"><span data-t-label="${reassembled?'reassembledContext':'context'}">${reassembled?t('reassembledContext'):'Seen on the laptop’s home network'}</span></div>
 ${parts?`<div class="ins-tabs" role="tablist" aria-label="${escape(t('packetSegments'))}" style="--segment-color:var(--${p.color})">${parts.map((f,i)=>`<button id="segment-tab-${i}" class="ins-tab ${selected===i?'selected':''}" role="tab" aria-selected="${selected===i}" aria-controls="segment-panel" tabindex="${selected===i?0:-1}" data-segment="${i}">${i===0?escape(t('segment'))+' ':''}${i+1} / ${parts.length} · ${byteCount(f.bytes.length)} B</button>`).join('')}${all.reassembled?`<button id="segment-tab-${parts.length}" class="ins-tab reassembled ${reassembled?'selected':''}" role="tab" aria-selected="${reassembled}" aria-controls="segment-panel" tabindex="${reassembled?0:-1}" data-segment="${parts.length}">${escape(t('reassembled'))} ${escape(streamName)} · ${byteCount(all.reassembled.bytes.length)} B</button>`:''}</div>`:''}
 <div class="ins-bar" dir="ltr">${layers.map(l=>`<span class="ins-seg c-${l.color}" role="button" tabindex="0" data-layer-target="layer-${l.index}" style="flex:${l.bytes.length}" title="${escape(l.name)} · ${l.bytes.length} bytes"><b>${escape(l.name==='Ethernet II'?'Ethernet':l.name)}</b><i>${l.bytes.length}</i></span>`).join('')}</div>
 <div class="ins-body" ${parts?`id="segment-panel" role="tabpanel" aria-labelledby="segment-tab-${selected}"`:""}><div class="ins-tree">${layers.map(l=>`<details class="ins-layer c-${l.color}" id="layer-${l.index}" open><summary><h4><span>${escape(l.name)}${['Ethernet II','IPv4','IPv6','UDP','TCP','ICMP','ARP'].includes(l.name)?` · ${l.bytes.length} bytes`:''}</span>${layerSummary(l)?`<em dir="ltr">${escape(layerSummary(l))}</em>`:''}</h4></summary>${fields.filter(f=>f.offset>=l.offset&&f.offset<l.offset+l.bytes.length).map(f=>`<div class="ins-field d${f.depth||0}" tabindex="0" data-field="${f.id}" data-start="${f.offset}" data-length="${f.length}"><span class="ins-name">${escape(f.name)}</span><span class="ins-value"><bdi dir="ltr">${escape(f.value)}${f.eg?' ':''}</bdi>${f.eg?'<i class="eg">E.G.</i>':''}</span>${f.note?`<p class="ins-note">${escape(fieldNote(f.note))}</p>`:''}</div>`).join('')}</details>`).join('')}</div>
 <div class="ins-hex"><div class="hx-head"><span class="hx-title">${t('bytes').toUpperCase()} </span><span>${byteCount(w.bytes.length)} ${reassembled?t('reassembledBytes'):t('inThisFrame')}</span></div>${Array.from({length:Math.ceil(w.bytes.length/16)},(_,r)=>{const start=r*16,b=w.bytes.slice(start,start+16);return `<div class="hx-row" dir="ltr"><span class="hx-at">${start.toString(16).padStart(4,'0')}</span><span class="hx-bytes">${Array.from(b,(v,j)=>`<span class="hx c-${byteLayer(start+j).color} ${opaque(start+j)?'is-unknown':''}" tabindex="0" ${fieldAttrs(start+j)} aria-label="Byte ${start+j}: ${v.toString(16).padStart(2,'0')}">${opaque(start+j)?'··':v.toString(16).padStart(2,'0')}</span>`).join('')}</span><span class="hx-text">${Array.from(b,(v,j)=>`<span class="as ${opaque(start+j)?'is-unknown':''}" ${fieldAttrs(start+j)}>${opaque(start+j)?'·':escape(v>=32&&v<=126?String.fromCharCode(v):'.')}</span>`).join('')}</span></div>`}).join('')}</div></div>
 <footer class="ins-foot"><span><i class="eg">E.G.</i> <span data-t-label="exampleLegend">an example value: it differs in every real capture</span></span><span><b>··</b> <span data-t-label="opaqueLegend">bytes the lesson can’t show: encrypted, random, or a file’s contents</span></span></footer></section>`;
}
const hoverListeners=new WeakMap<HTMLElement,AbortController>();
export function wireHover(root:HTMLElement,onSegment?:(index:number)=>void){
 hoverListeners.get(root)?.abort();const controller=new AbortController();hoverListeners.set(root,controller);
 const clear=()=>root.querySelectorAll('.is-lit').forEach(x=>x.classList.remove('is-lit'));
 const highlight=(target:Element|null)=>{clear();if(!target)return;const field=target.closest<HTMLElement>('[data-field]'),byte=target.closest<HTMLElement>('[data-offset]');const id=field?.dataset.field||byte?.dataset.owner;if(id===undefined||id==='-1')return;root.querySelectorAll<HTMLElement>('[data-field],[data-owner]').forEach(e=>e.classList.toggle('is-lit',e.dataset.field===id||e.dataset.owner===id))};
 root.onpointerover=e=>highlight(targetEl(e));root.onpointerleave=clear;root.addEventListener('focusin',e=>highlight(targetEl(e)),{signal:controller.signal});root.addEventListener('focusout',clear,{signal:controller.signal});
 root.addEventListener('click',e=>{const tab=targetEl(e)?.closest<HTMLElement>('[data-segment]');if(tab)onSegment?.(Number(tab.dataset.segment))},{signal:controller.signal});
 root.onkeydown=e=>{
  const tabs=Array.from(root.querySelectorAll<HTMLElement>('[data-segment]'));
  const targetTab=targetEl(e)?.closest('[data-segment]');
  const bracket=e.key==='['||e.key===']';
  if(tabs.length&&(bracket||targetTab&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key))){
   e.preventDefault();e.stopPropagation();const current=tabs.findIndex(t=>t.getAttribute('aria-selected')==='true');
   const rtl=document.documentElement.dir==='rtl';const forward=bracket?e.key===']':(e.key==='ArrowRight')!==rtl;
   const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(forward?1:-1)+tabs.length)%tabs.length;onSegment?.(next);return;
  }
  const target=targetEl(e)?.closest<HTMLElement>('[data-layer-target]');if(target&&(e.key==='Enter'||e.code==='Space')){e.preventDefault();target.click()}};
}
