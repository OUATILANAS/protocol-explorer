import{chromium}from'playwright';import{writeFile}from'node:fs/promises';const browser=await chromium.launch(),all=[];
for(const[name,url]of[['reference','https://protocol-explorer-alpha.vercel.app/'],['local','http://127.0.0.1:5173/']]){
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,colorScheme:'dark'});await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(3000);
 all.push({name,buttons:await page.locator('button:visible').evaluateAll(buttons=>buttons.map(b=>({aria:b.getAttribute('aria-label'),text:b.textContent,html:b.innerHTML,rect:[b.getBoundingClientRect().x,b.getBoundingClientRect().y,b.getBoundingClientRect().width,b.getBoundingClientRect().height]})))});await page.close();
}await browser.close();await writeFile('qa/upgrade/icon-diagnostics.json',JSON.stringify(all,null,2));
