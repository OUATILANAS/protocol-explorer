// Read-only measurement hook in a browser copy; the captured reference assets stay unchanged.
import{chromium}from'playwright';import{readFile,writeFile}from'node:fs/promises';import{parseSync}from'rolldown/experimental';
const manifest=JSON.parse(await readFile('qa/upgrade/reference-33-manifest.json'));
const main=manifest.assets.find(a=>/^\/assets\/index-.*\.js$/.test(a.path)).path,code=await readFile('qa/reference-33'+main,'utf8'),ast=parseSync(main,code).program;
const declarations=ast.body.flatMap(s=>s.declarations||[]);
const lessons=declarations.find(d=>d.init?.type==='ObjectExpression'&&['http','https','tcp','websocket'].every(key=>d.init.properties.some(p=>(p.key?.name??p.key?.value)===key)))?.id.name;
const catalog=declarations.find(d=>d.init?.type==='ArrayExpression'&&d.init.elements.length===33&&d.init.elements[0]?.type==='ObjectExpression')?.id.name;
if(!lessons||!catalog)throw Error('Reference lesson registry not found; inspect the new version');
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1680,height:945}});
await page.route('**'+main,r=>r.fulfill({contentType:'application/javascript',body:code+`\n;globalThis.__referenceData={catalog:${catalog},lessons:${lessons}};`}));
await page.goto('http://127.0.0.1:5180/',{waitUntil:'networkidle'});
const result=await page.evaluate(()=>{
 const{catalog,lessons}=window.__referenceData;
 const technical=event=>{
  if(event.type==='packet')return{...event};
  // Stream payloads contain packet rows too; preserve all technical metadata.
  return{...event};
 };
 return{catalog,lessons:Object.values(lessons).map(l=>({...l,overview:{full:l.overview.full,facts:l.overview.facts},outro:{title:l.outro.title,desc:l.outro.desc,facts:l.outro.facts},steps:l.steps.map(s=>({title:s.title,desc:s.desc,facts:s.facts,events:s.events.map(technical)}))}))};
});await browser.close();await writeFile('qa/upgrade/reference-33-technical.json',JSON.stringify(result,null,2)+'\n');
console.log(result.lessons.map(l=>({id:l.id,steps:l.steps.length,packets:l.steps.flatMap(s=>s.events).filter(e=>e.type==='packet').length,streams:l.steps.flatMap(s=>s.events).filter(e=>e.type==='stream').length})));
console.log('Wire shape',JSON.stringify(result.lessons[0].steps.flatMap(s=>s.events).find(e=>e.type==='packet').row.wire).slice(0,1600));
