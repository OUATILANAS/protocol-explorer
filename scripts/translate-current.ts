// Build-time drafts only. The application never contacts a translation service.
import{readFileSync,writeFileSync,mkdirSync,existsSync}from'node:fs';import{currentLessons,prepareLesson}from'../src/lessons/current';import{ui}from'../src/i18n/en';
import{lessons as legacyLessons}from'../src/lessons';
import{explainField}from'../src/wire/field-explanations';
await Promise.all(currentLessons.map(l=>prepareLesson(l.id)));
const extra=['Search protocols','Search protocols and steps','No matching protocols or steps.','↑ ↓ to navigate · Enter to open · Esc to close','Protocol list','Diagram only','Fullscreen','Keyboard shortcuts','Close','Playback speed','Play / pause','Previous / next step','Network / sequence','Previous / next segment','Close / reset'];
const texts=new Set(extra);Object.values(ui).forEach(s=>texts.add(s));
for(const l of [...currentLessons,...legacyLessons]){[l.name,l.title,l.drawerFull||'',l.overview.full,l.overview.description,l.outro.title,l.outro.desc,l.outro.text,...l.overview.facts.flat(),...l.outro.facts.flat(),...l.legend.map(x=>x[1]),...l.steps.flatMap(s=>[s.title,s.desc,s.detail,...s.facts.flat()])].filter(Boolean).forEach(s=>texts.add(s));}
for(const lesson of currentLessons)for(const step of lesson.steps)for(const event of step.events)if('wire'in event){const capture=event.wire();for(const layer of [...capture.layers,...(capture.reassembled?.layers||[])])for(const field of layer.fields)texts.add(field.note)}
const strings=[...texts].filter(s=>!/^\d[\d.: /-]*$/.test(s)&&!/^\b(?:TCP|UDP|TLS|HTTP|IPv4|IPv6|ICMP|DNS)\b$/.test(s));
writeFileSync('qa/upgrade/current-translation-inventory.json',JSON.stringify({strings,ui},null,2));
mkdirSync('qa/upgrade/translated-locales',{recursive:true});
const codes=(process.argv.includes('--locales')?process.argv[process.argv.indexOf('--locales')+1].split(','):['es','pt','fr','de','tr','uk','id','ja','zh','zh-TW','ko','hi','ar','he']);let done=0;
async function request(q:string,code:string){for(let n=0;n<5;n++)try{const r=await fetch('https://translate.googleapis.com/translate_a/single?'+new URLSearchParams({client:'gtx',sl:'en',tl:code==='zh'?'zh-CN':code,dt:'t',q}),{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(String(r.status));return(await r.json())[0].map((x:unknown[])=>x[0]||'').join('')}catch(e){if(n===4)throw e;await new Promise(r=>setTimeout(r,1000+n*500))}throw Error('translation failed')}
async function worker(){while(codes.length){const code=codes.shift()!,path=`src/i18n/${code}.locale.ts`,staged=`qa/upgrade/translated-locales/${code}.ts`,source=readFileSync(existsSync(staged)?staged:path,'utf8'),data=JSON.parse(source.split('export default ')[1].trim().replace(/;$/,''));const live=JSON.parse(readFileSync(path,'utf8').split('export default ')[1].trim().replace(/;$/,''));data.ui={...data.ui,...live.ui};data.text={...data.text,...live.text};
 const missing=strings.filter(s=>!data.text[s]);const batches:string[][]=[];let batch:string[]=[],n=0;for(const s of missing){if(n+s.length>2200&&batch.length){batches.push(batch);batch=[];n=0}batch.push(s);n+=s.length+1}if(batch.length)batches.push(batch);
 for(const group of batches){const lines=(await request(group.join('\n'),code)).split('\n');if(lines.length===group.length)group.forEach((s,i)=>data.text[s]=lines[i]);else for(const s of group)data.text[s]=await request(s,code);writeFileSync(staged,'// review: new lesson translations are machine drafts.\nexport default '+JSON.stringify(data)+';\n')}
 for(const [key,value]of Object.entries(ui))data.ui[key]=data.text[value]||data.ui[key];writeFileSync(staged,'// review: new lesson translations are machine drafts.\nexport default '+JSON.stringify(data)+';\n');
 console.log(`${code}: ${missing.length} new strings (${++done}/14 locales)`);
}}
await Promise.all(Array.from({length:3},worker));
