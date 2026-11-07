import type{Lesson,LessonId}from'../types';
import{escape}from'./side-panel';
import{targetEl}from'../state/event-target';
import{trapFocus}from'../state/keyboard';
import{tr}from'../i18n';
export const searchIcon='<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10.4 10.4 L14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
export const searchButton=()=>`<button class="search-btn" data-action="search" aria-label="${escape(tr('Search protocols'))}" aria-haspopup="dialog">${searchIcon}<span class="search-text">${escape(tr('Search protocols'))}</span><kbd class="search-kbd">${navigator.platform.includes('Mac')?'⌘':'Ctrl'} K</kbd></button>`;
export function searchEntries(lessons:Lesson[],query:string){
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return lessons.flatMap(l=>{
  const protocol=[l.name,l.overview.full,l.title].join(' ').toLocaleLowerCase(),entries:{id:LessonId;step?:number;title:string;subtitle:string}[]=[];
  if(!terms.length||terms.every(t=>protocol.includes(t)))entries.push({id:l.id,title:l.name,subtitle:l.overview.full});
  if(terms.length)l.steps.forEach((s,step)=>{if(terms.every(t=>`${protocol} ${s.title} ${s.desc}`.toLocaleLowerCase().includes(t)))entries.push({id:l.id,step,title:s.title,subtitle:`${l.name} · ${s.desc}`})});
  return entries;
 }).slice(0,80);
}
export function createSearch(lessons:()=>Lesson[],select:(id:LessonId,step?:number)=>void,pause:()=>void){
 let dialog:HTMLDialogElement|null=null,restore:HTMLElement|null=null,untrap=()=>{};
 function close(){if(!dialog)return;untrap();dialog.close();dialog.remove();dialog=null;document.querySelector<HTMLElement>('.shell')!.inert=false;document.documentElement.classList.remove('is-locked');restore?.focus({preventScroll:true})}
 function open(){if(dialog)return;pause();restore=document.activeElement as HTMLElement;dialog=document.createElement('dialog');dialog.className='search-dialog';dialog.setAttribute('aria-label',tr('Search protocols'));dialog.innerHTML=`<div class="search-input-row">${searchIcon}<input aria-label="${escape(tr('Search protocols and steps'))}" placeholder="${escape(tr('Search protocols and steps'))}" autocomplete="off"><button class="btn icon-btn" aria-label="${escape(tr('Close'))}" data-search-close>×</button></div><div class="search-results"></div><footer>${escape(tr('↑ ↓ to navigate · Enter to open · Esc to close'))}</footer>`;document.body.append(dialog);document.querySelector<HTMLElement>('.shell')!.inert=true;document.documentElement.classList.add('is-locked');dialog.showModal();
  const input=dialog.querySelector('input')!,results=dialog.querySelector<HTMLElement>('.search-results')!;
  const render=()=>{const entries=searchEntries(lessons(),input.value);results.innerHTML=entries.length?entries.map(e=>`<button data-result="${e.id}" ${e.step===undefined?'':`data-result-step="${e.step}"`}><strong>${escape(e.title)}</strong><span>${escape(e.subtitle)}</span></button>`).join(''):`<p>${escape(tr('No matching protocols or steps.'))}</p>`};render();input.addEventListener('input',render);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('click',e=>{const target=targetEl(e);if(target?.closest('[data-search-close]'))close();const result=target?.closest<HTMLElement>('[data-result]');if(result){const id=result.dataset.result as LessonId,step=result.dataset.resultStep;close();select(id,step===undefined?undefined:Number(step))}});
  dialog.addEventListener('keydown',e=>{if(!dialog)return;const items=Array.from(results.querySelectorAll<HTMLButtonElement>('button'));if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const i=items.indexOf(document.activeElement as HTMLButtonElement);items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}if(e.key==='Enter'&&document.activeElement===input){e.preventDefault();items[0]?.click()}});untrap=trapFocus(dialog);input.focus();
 }
 return{open,close,isOpen:()=>!!dialog};
}
