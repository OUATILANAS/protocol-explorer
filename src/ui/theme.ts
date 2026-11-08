/** Reveal the new palette from the clicked control, matching the live reference. */
export function revealTheme(apply:()=>void,control?:HTMLElement){
 if(!control||!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){apply();return}
 const rect=control.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
 const transition=document.startViewTransition(apply);
 void transition.ready.then(()=>document.documentElement.animate(
  {clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]},
  {duration:650,easing:'cubic-bezier(0.16, 1, 0.3, 1)',pseudoElement:'::view-transition-new(root)'}
 )).catch(()=>{/* A newer theme click can skip an unfinished snapshot. */});
}
