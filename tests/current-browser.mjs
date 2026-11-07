import{chromium}from'playwright';import assert from'node:assert/strict';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:5173/?parity=1',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.__protocol);await page.waitForTimeout(300);
assert.equal(await page.locator('[data-lesson]').count(),33);assert.match(await page.locator('.filter-tabs').textContent(),/33/);
await page.locator('[data-action=search]').click();await page.locator('.search-dialog input').fill('websocket');await page.locator('[data-result=websocket]').first().click();await page.waitForFunction(()=>window.__protocol.engine.lessonId==='websocket');assert.equal(await page.locator('html').getAttribute('dir'),'ltr');assert.equal(await page.locator('.search-dialog').count(),0);
console.log('Current catalog, search and lazy lesson selection: passed');
const ids=await page.evaluate(()=>window.__protocol.lessons.map(l=>l.id));
for(const id of ids){
 await page.evaluate(async id=>{const p=window.__protocol;await p.prepareLesson(id);p.engine.setLesson(p.lessons.find(l=>l.id===id));p.engine.reduced=()=>true;p.engine.play();for(let n=0;n<10000&&!p.engine.complete;n++)p.engine.tick(1000)},id);
 assert.equal(await page.evaluate(()=>window.__protocol.engine.complete),true,id);
 await page.evaluate(()=>window.__protocol.openPacket(0));assert.ok(await page.locator('.inspector').count(),`${id}: first inspector`);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const p=window.__protocol;p.openPacket(p.engine.scene.packets.length-1)});assert.ok(await page.locator('.inspector').count(),`${id}: last inspector`);await page.keyboard.press('Escape');
}
console.log('33 complete lessons and 66 packet inspectors: passed');assert.deepEqual(errors,[]);await browser.close();
