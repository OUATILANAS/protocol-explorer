import{chromium}from'playwright';import{writeFile}from'node:fs/promises';
const browser=await chromium.launch(),results=[];
for(const[width,height]of[[1680,945],[1280,800],[1024,768],[700,900],[375,812]]){
 const result={width,height};
 for(const[name,url]of[['reference','https://protocol-explorer-alpha.vercel.app/'],['local','http://127.0.0.1:5173/?parity=1']]){
  const page=await browser.newPage({viewport:{width,height},colorScheme:'dark'});await page.goto(url);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
  result[name]=await page.evaluate(()=>Array.from(document.querySelectorAll('p')).filter(p=>p.textContent.length>60&&p.textContent.length<500).map(p=>{const r=p.getBoundingClientRect(),s=getComputedStyle(p);return{class:p.className,length:p.textContent.length,x:r.x,y:r.y,width:r.width,height:r.height,lineHeight:s.lineHeight,fontSize:s.fontSize,weight:s.fontWeight}}));
  if(name==='local')result.candidates=await page.evaluate(()=>{const p=document.querySelector('.side-body .description'),old=p.textContent;return[' Each packet can be paused, opened and read one byte at a time.',' Watch each packet leave the laptop, cross the network and reach its next hop.',' Pause the exchange to inspect the headers and payload of each packet.'].map(suffix=>{p.textContent=old+suffix;return{suffix,length:p.textContent.length,height:p.getBoundingClientRect().height}})});
  await page.close();
 }
 results.push(result);console.log(JSON.stringify(result));
}
await browser.close();await writeFile('qa/upgrade/description-measurements.json',JSON.stringify(results,null,2));
