type Point=[number,number];
type Polygon=Point[];

function intersects(a:Polygon,b:Polygon){
 for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){
  const current=polygon[i],next=polygon[(i+1)%polygon.length],axis:Point=[next[1]-current[1],current[0]-next[0]];
  const project=(points:Polygon)=>points.map(([x,y])=>x*axis[0]+y*axis[1]);
  const pa=project(a),pb=project(b);
  if(Math.max(...pa)<=Math.min(...pb)||Math.max(...pb)<=Math.min(...pa))return false;
 }
 return true;
}

/** Place longer labels first, then slide crowded labels along their own arrows. */
export function placeSequenceLabels(root:Element){
 const occupied:Polygon[]=[];
 root.querySelectorAll<SVGPathElement>('.seq-cross').forEach(cross=>{const b=cross.getBBox();occupied.push([[b.x-4,b.y-4],[b.x+b.width+4,b.y-4],[b.x+b.width+4,b.y+b.height+4],[b.x-4,b.y+b.height+4]])});
 const arrows=Array.from(root.querySelectorAll<SVGGElement>('.seq-arrow')).map(arrow=>({arrow,label:arrow.querySelector<SVGGElement>('.seq-label')!,width:arrow.querySelector<SVGTextElement>('.seq-label-text')!.getComputedTextLength()})).sort((a,b)=>b.width-a.width);
 for(const {arrow,label,width} of arrows){
  const [x1,y1,x2,y2,angle]=arrow.dataset.geo!.split(' ').map(Number),theta=angle*Math.PI/180,cos=Math.cos(theta),sin=Math.sin(theta),half=width/2+6;
  const shape:Polygon=[[-half-2,-21],[half+2,-21],[half+2,3],[-half-2,3]];
  const at=(fraction:number)=>{const x=x1+(x2-x1)*fraction,y=y1+(y2-y1)*fraction;return{fraction,x,y,box:shape.map(([dx,dy])=>[x+dx*cos-dy*sin,y+dx*sin+dy*cos] as Point)}};
  const margin=Math.min(.45,(half+8)/Math.hypot(x2-x1,y2-y1)),choices=[.5,.4,.6,.3,.7,.2,.8,.12,.88].filter(t=>t>=margin&&t<=1-margin).map(at),overlaps=(candidate:ReturnType<typeof at>)=>occupied.filter(polygon=>intersects(candidate.box,polygon)).length;
  const selected=choices.find(candidate=>overlaps(candidate)===0)||[...choices,at(.5)].sort((a,b)=>overlaps(a)-overlaps(b))[0];
  occupied.push(selected.box);label.dataset.fraction=String(selected.fraction);label.setAttribute('transform',`translate(${selected.x.toFixed(1)} ${selected.y.toFixed(1)}) rotate(${angle})`);
 }
}
