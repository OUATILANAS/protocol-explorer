/** Fit translated taglines to the wordmark using the shared measured type scale. */
export function fitBrandTagline(){
 const heading=document.querySelector<HTMLElement>('.brand h1'),tag=document.querySelector<HTMLElement>('.brand .tagline');if(!heading||!tag||!heading.offsetWidth)return;
 const width=(el:Element)=>{const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect().width};
 tag.style.letterSpacing='';tag.style.fontSize='';const limit=width(heading),full=width(tag);if(full<=limit)return;
 const style=getComputedStyle(tag),font=parseFloat(style.fontSize),tracking=parseFloat(style.letterSpacing)/font;
 tag.style.letterSpacing='.02em';const tight=width(tag);
 if(tight<=limit)tag.style.letterSpacing=`${tracking-(full-limit)/(full-tight)*(tracking-.02)}em`;
 else tag.style.fontSize=`${font*limit/tight}px`;
}
const measuredLabels=new WeakMap<HTMLElement,string>();
export function fitPlaybackLabels(values:string[],key:string){
 const label=document.querySelector<HTMLElement>('.play-btn .toggle-label');if(!label||measuredLabels.get(label)===key)return;
 const original=label.textContent;label.style.minWidth='';const widths=values.map(value=>{label.textContent=value;return label.scrollWidth});label.textContent=original;
 const width=Math.max(...widths);if(width)label.style.minWidth=`${width}px`;measuredLabels.set(label,key);
}
