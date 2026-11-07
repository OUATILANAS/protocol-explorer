import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{chromium}from'playwright';
test('original prose cannot rename a panel, but remains available for strict text checks',async()=>{
 const source=readFileSync('upgrade/scripts/compare-reference.mjs','utf8'),start=source.indexOf('const extract = ')+16,end=source.indexOf('\n};',start)+2,extract=Function('return ('+source.slice(start,end)+')')();
 const browser=await chromium.launch();try{const page=await browser.newPage();await page.setContent('<section style="border:1px solid blue;background:white;width:400px"><h2>ÜBERSICHT</h2><b>HTTP</b> <span>AKTIV</span><p>Hypertext-Übertragung</p><p class="description">HTTP describes requests and replies. This explanation is original and can use different words.</p><table><tr><td>GET / HTTP/1.1</td></tr></table></section>');
 const before:any=await page.evaluate(extract);await page.locator('.description').evaluate(el=>el.textContent='Ein Browser fordert eine Ressource an. This is a different original explanation with the same lesson purpose.');const after:any=await page.evaluate(extract);
 const panel=(data:any)=>data.boxes.find((box:any)=>box.key.startsWith('übersicht http aktiv'));
 assert.equal(panel(before).key,panel(after).key);assert.ok(after.texts.some((t:any)=>t.text.startsWith('Ein Browser')));assert.ok(after.texts.some((t:any)=>t.text==='GET / HTTP/1.1'));
 }finally{await browser.close()}
});
