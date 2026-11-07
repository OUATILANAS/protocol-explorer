import{chromium}from'playwright';import{writeFile}from'node:fs/promises';
const browser=await chromium.launch(),all=[];
for(const[width,height]of[[1680,945],[1280,800],[1024,768],[700,900],[375,812]]){
 const item={width,height};
 for(const[name,url]of[['reference','https://protocol-explorer-alpha.vercel.app/'],['local','http://127.0.0.1:5173/']]){
  const p=await browser.newPage({viewport:{width,height},colorScheme:'dark',isMobile:width===375,hasTouch:width===375});await p.goto(url,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(2500);
  for(let i=0;i<2;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(120)}await p.keyboard.press(' ');await p.waitForTimeout(2200);
  item[name]=await p.evaluate(()=>{const e=document.querySelector('.side-body.explain .description')||[...document.querySelectorAll('p.explain-text')].find(e=>e.checkVisibility());const r=e.getBoundingClientRect();return{length:e.textContent.length,rect:[r.x,r.y,r.width,r.height],line:getComputedStyle(e).lineHeight}});
  if(name==='local')item.candidates=await p.evaluate(()=>{const p=document.querySelector('.side-body.explain .description'),old=p.textContent;return[' Cached records save another lookup. The resolver reuses an answer only while its time to live remains valid.',' Cached answers can be reused until their time to live expires.',' A cached result avoids repeating the lookup. The reply also gives a time to live, so the resolver knows when it must ask again.'].map(s=>{p.textContent=old+s;return{suffix:s,length:p.textContent.length,height:p.getBoundingClientRect().height}})});
  await p.close();
 }all.push(item);console.log(JSON.stringify(item));
}await browser.close();await writeFile('qa/upgrade/step-measurements.json',JSON.stringify(all,null,2));
