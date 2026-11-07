import data from'./current-catalog.json';
import type{Lesson,LessonId,NodeId,Frame,Event,PacketEvent,Fact,Color}from'../types';
import httpCalibration from'./http-calibration.json';
import{loadModels,model,lessonEvents}from'./model-loader';
import{encodeRecipe}from'../wire/recipe';
interface ReferencePacket{type:'packet';from:NodeId;to:NodeId;color:Color;label:string;payload:string[];lost?:boolean;row:PacketEvent['row']}
type Prose={overview:string;outro:string;steps:string[]};
let prose:Promise<Record<string,Prose>>|undefined;
const loadProse=():Promise<Record<string,Prose>>=>prose??=Promise.all([import('./legacy-content.json'),import('./current-prose')]).then(([old,current])=>({...old.default,...current.authored} as Record<string,Prose>));
export const catalogOrder=data.map(l=>l.id) as LessonId[];
const hydrators=new Map<LessonId,()=>void>();
const hydrated=new Set<LessonId>();
export const currentLessons:Lesson[]=data.map(raw=>{
 const id=raw.id as LessonId;let packetIndex=0;
 function packet(event:ReferencePacket):PacketEvent{
  const index=packetIndex++;
  return{type:'packet',from:event.from,to:event.to,color:event.color,tag:event.label,lines:event.payload,lost:event.lost,row:{...event.row,time:event.row.time.replace(/s$/,'')},wire:()=>encodeRecipe(model(id,index))};
 }
 function convert(inputs:unknown[]):Event[]{return inputs.flatMap((input):Event[]=>{
   const e=input as Record<string,unknown>;
   if(e.type==='packet')return[packet(input as ReferencePacket)];
   if(e.type==='stream')return(e.packets as ReferencePacket[]).map(packet);
   if(e.type==='type-url')return[{type:'type-url',text:String(e.text)}];
   if(e.type==='render')return[{type:'loaded-url',text:'www.example.com'}];
   if(e.type==='show')return[{type:'show',nodes:e.nodes as NodeId[],frame:e.frame as Frame}];
   if(e.type==='camera')return[{type:'camera',frame:e.frame as Frame}];
   if(e.type==='label')return[{type:'label',at:e.at as NodeId,label:e.label as [string,string]}];
   if(e.type==='note')return[{type:'note',at:e.at as NodeId,text:String(e.text),tone:(e.tone||'amber') as Color}];
   throw Error('Unsupported lesson event '+String(e.type));
  });
 }
 const steps=raw.steps.map((s,index)=>{const events:Event[]=[];
  const detail='Loading lesson…';
  return{title:s.title,desc:s.desc,detail,facts:s.facts as Fact[],events};
 });
 const result:Lesson={id,name:raw.name,title:raw.title,layer:raw.layer as Lesson['layer'],category:raw.category as Lesson['category'],nodes:raw.nodes as NodeId[],nodeLabels:Object.fromEntries(Object.entries((raw as {labels?:Record<string,string[]>}).labels||{}).map(([id,label])=>[id,label.filter(Boolean).join(' / ')])),latency:raw.latency as unknown as Record<string,number>,legend:raw.legend as [Color|null,string][],drawerFull:(raw as {drawerFull?:string}).drawerFull,overview:{full:raw.overview.full,description:'Loading lesson…',facts:raw.overview.facts as Fact[]},outro:{title:raw.outro.title,desc:raw.outro.desc,text:'Loading lesson…',facts:raw.outro.facts as Fact[]},start:raw.start as Lesson['start'],steps};
 hydrators.set(id,()=>{
  packetIndex=0;const eventSteps=lessonEvents(id);
  result.steps.forEach((step,i)=>{step.events=convert(eventSteps[i])});
  if(id==='http'){
   result.playback=httpCalibration.playback;
   result.steps.forEach((step,i)=>{const packets=step.events.filter((e):e is PacketEvent=>'from'in e);let n=0;step.events=httpCalibration.steps[i].map(e=>e.type==='packet'?{...packets[n++],sequence:'sequence'in e?e.sequence:undefined}:e as Event)});
  }
 });
 return result;
});
export async function prepareLesson(id:LessonId){
 const[,texts]=await Promise.all([loadModels(id),loadProse()]);
 const lesson=currentLessons.find(l=>l.id===id)!;
 if(!hydrated.has(id)){
  const content=texts[id];if(!content)throw Error('Missing authored lesson '+id);
  lesson.overview.description=content.overview;lesson.outro.text=content.outro;
  lesson.steps.forEach((step,index)=>{if(!content.steps[index])throw Error(`Missing explanation ${id}/${index}`);step.detail=content.steps[index]});
  hydrators.get(id)!();hydrated.add(id);
 }
 return lesson;
}
