import{readFile,writeFile,mkdir}from'node:fs/promises';
const source=JSON.parse(await readFile('qa/upgrade/reference-33-technical.json'));
const event=e=>e.type==='stream'?{...e,packets:e.packets.map(event)}:e.type==='packet'?{...e,row:{...e.row,wire:undefined}}:e;
const lessons=source.catalog.map(c=>{
 const l=source.lessons.find(l=>l.id===c.id);return{...l,drawerFull:c.full,category:c.group,steps:l.steps.map(s=>({...s,events:s.events.map(event)}))};
});
await mkdir('src/lessons/reference-events',{recursive:true});
for(const lesson of lessons){await writeFile(`src/lessons/reference-events/${lesson.id}.json`,JSON.stringify(lesson.steps.map(s=>s.events))+'\n');lesson.steps.forEach(s=>s.events=[])}
await writeFile('src/lessons/current-catalog.json',JSON.stringify(lessons)+'\n');
const ids=lessons.map(l=>l.id);
await writeFile('src/lessons/model-loader.ts',`import type{PacketRecipe}from'../wire/recipe';\nconst loaders:Record<string,()=>Promise<{default:unknown}>>={\n${ids.map(id=>`${JSON.stringify(id)}:()=>import('./reference-models/${id}.json')`).join(',\n')}\n};\nconst eventLoaders:Record<string,()=>Promise<{default:unknown}>>={\n${ids.map(id=>`${JSON.stringify(id)}:()=>import('./reference-events/${id}.json')`).join(',\n')}\n};\nconst eventCache=new Map<string,unknown[][]>();\nexport const lessonEvents=(id:string)=>eventCache.get(id)!;\nconst cache=new Map<string,PacketRecipe[]>();\nexport async function loadModels(id:string){if(!cache.has(id)){const load=loaders[id];if(!load)throw Error('Unknown lesson '+id);const [bytes,events]=await Promise.all([load(),eventLoaders[id]()]);cache.set(id,bytes.default as PacketRecipe[]);eventCache.set(id,events.default as unknown[][])}}\nexport function model(id:string,index:number):PacketRecipe{const result=cache.get(id)?.[index];if(!result)throw Error('Lesson bytes are not loaded: '+id);return result}\n`);
console.log('Catalog generated:',ids.length);
