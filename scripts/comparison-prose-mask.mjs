// User-approved exception, 2026-11-07: explanations and the credited handle may
// differ. Keep raw screenshots and raw pixel counts; exclude only their ink
// regions from the pass metric. Their layout remains checked separately.
export function collectPixelMasks({strict,ignoreSource,ignoreFlags}){
 const masks=[];
 const add=(element,kind)=>{
  if(!element.checkVisibility({opacityProperty:true,visibilityProperty:true}))return;
  const r=element.getBoundingClientRect();if(!r.width||!r.height)return;
  masks.push({kind,rect:[r.x+scrollX,r.y+scrollY,r.width,r.height]});
 };
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
