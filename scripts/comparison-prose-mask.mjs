// User-approved exception, 2026-11-07: explanations and the credited handle may
// differ. Keep raw screenshots and raw pixel counts; exclude only their ink
// regions from the pass metric. Their layout remains checked separately.
export function collectPixelMasks({strict,ignoreSource,ignoreFlags}){
 const masks=[];
 const add=(element,kind)=>{
  if(!element.checkVisibility({opacityProperty:true,visibilityProperty:true}))return;
  const r=element.getBoundingClientRect();if(!r.width||!r.height)return;
  let x=r.x,y=r.y,right=r.right,bottom=r.bottom;
  for(let p=element.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(s.overflowX!=='visible'){x=Math.max(x,b.x);right=Math.min(right,b.right)}if(s.overflowY!=='visible'){y=Math.max(y,b.y);bottom=Math.min(bottom,b.bottom)}if(s.position==='fixed')break}
  if(right>x&&bottom>y)masks.push({kind,rect:[x+scrollX,y+scrollY,right-x,bottom-y]});
 };
 if(!strict)document.querySelectorAll('.ins-note').forEach(p=>add(p,'field-explanation'));
 if(!strict)document.querySelectorAll('p.overview-desc,p.explain-text,p.description').forEach(p=>{
  if(p.textContent.replace(/\s+/g,' ').trim().length>60)add(p,'lesson-prose');
 });
 const ignore=new RegExp(ignoreSource,ignoreFlags);
 document.querySelectorAll('.credit a,a.credit').forEach(a=>{if(ignore.test(a.textContent))add(a,'credit')});
 return masks;
}
export function compareProseGeometry(reference,local,tolerance=1){
 const a=reference.filter(m=>m.kind==='lesson-prose'),b=local.filter(m=>m.kind==='lesson-prose');
 if(a.length!==b.length)return [`prose block count ${b.length} (ref ${a.length})`];
 return a.flatMap((m,i)=>m.rect.some((n,j)=>Math.abs(n-b[i].rect[j])>tolerance)?[`prose block ${i+1} geometry ${b[i].rect.map(n=>n.toFixed(1)).join(',')} (ref ${m.rect.map(n=>n.toFixed(1)).join(',')})`]:[]);
}
