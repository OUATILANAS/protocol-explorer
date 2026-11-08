import type{Lesson,LessonId}from'../types';
export interface LessonRoute{lessonId:LessonId;stepIndex?:number;packetIndex?:number;view:'network'|'sequence'}
export function parseRoute(hash:string,lessons:Pick<Lesson,'id'|'steps'>[],packetCount:(id:LessonId)=>number):LessonRoute{
 let parts:string[];try{parts=decodeURIComponent(hash.replace(/^#/,'' )).split('/').filter(Boolean)}catch{parts=[]}
 const id=parts[0]==='http3'?'quic':parts[0],lesson=lessons.find(l=>l.id===id)||lessons[0];if(!lesson)throw Error('No lessons');const route:LessonRoute={lessonId:lesson.id,view:'network'};
 if(id!==lesson.id)return route;
 for(const part of parts.slice(1)){let m;if(part==='sequence')route.view='sequence';else if(m=/^step-(\d+)$/.exec(part)){route.stepIndex=Math.min(lesson.steps.length-1,Math.max(0,Number(m[1])-1))}else if(m=/^packet-(\d+)$/.exec(part)){const count=packetCount(lesson.id);if(count>0)route.packetIndex=Math.min(count-1,Math.max(0,Number(m[1])-1))}}
 return route;
}
export function routeHash(route:LessonRoute){return '#'+[route.lessonId,...(route.stepIndex===undefined?[]:[`step-${route.stepIndex+1}`]),...(route.packetIndex===undefined?[]:[`packet-${route.packetIndex+1}`]),...(route.view==='sequence'?['sequence']:[])].join('/')}
