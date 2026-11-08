import{read,write}from'../state/storage';import{has}from'../features';
const saved=read<unknown>('upgrade-progress:v1',{}),value=saved&&typeof saved==='object'?saved as Record<string,unknown>:{};
export const learningProgress={opened:Array.isArray(value.opened)?value.opened.filter((v):v is string=>typeof v==='string'):[],quiz:value.quiz&&typeof value.quiz==='object'?Object.fromEntries(Object.entries(value.quiz).filter(([id,score])=>/^[a-z0-9-]+$/.test(id)&&typeof score==='number'&&Number.isInteger(score)&&score>=0&&score<=3)) as Record<string,number>:{}};
export function opened(id:string){return learningProgress.opened.includes(id)}
export function markOpened(id:string){if(!has('newLessons')||opened(id))return;learningProgress.opened.push(id);write('upgrade-progress:v1',learningProgress)}
export function saveQuiz(id:string,score:number){if(!has('quiz'))return;learningProgress.quiz[id]=Math.max(learningProgress.quiz[id]||0,Math.min(3,Math.max(0,Math.floor(score))));write('upgrade-progress:v1',learningProgress)}
