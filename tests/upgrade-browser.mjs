import{chromium}from'playwright';import assert from'node:assert/strict';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/?parity=1');await page.waitForFunction(()=>window.__protocol);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
await page.evaluate(()=>{
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'v',bubbles:true}));
 document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
 document.dispatchEvent(new MouseEvent('click',{bubbles:true}));
 const span=document.createElement('span');span.textContent='Synthetic target';document.body.append(span);span.firstChild.dispatchEvent(new MouseEvent('click',{bubbles:true}));span.remove();window.__protocol.engine.reset();window.__protocol.switchView('network');
});
await page.waitForTimeout(500);assert.deepEqual(errors,[]);console.log('Document, window and text-node event delegation: passed');
for(const width of [1,1280]){
 await page.setViewportSize({width,height:800});await page.waitForTimeout(150);
 const viewBox=await page.locator('#network-svg').getAttribute('viewBox');
 assert.ok(viewBox.split(/\s+/).map(Number).every(Number.isFinite),'camera remains finite while viewport collapses');
}
console.log('Camera survives a collapsed viewport and restores without SVG errors: passed');
const elapsed=await page.evaluate(async()=>{
 const engine=window.__protocol.engine;engine.seek(4,true);
 const until=performance.now()+280;while(performance.now()<until){}
 await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const elapsed=engine.clock;engine.pause();engine.reset();return elapsed;
});assert.ok(elapsed>=240,`foreground frame delay must advance the timeline (${elapsed}ms)`);
console.log('Foreground timeline catches up after a delayed animation frame: passed');
await page.setViewportSize({width:1680,height:945});await page.waitForFunction(()=>document.documentElement.dataset.layout==='wide');
await page.evaluate(()=>window.__protocol.engine.seek(4,true));await page.waitForFunction(()=>window.__protocol.engine.complete,null,{timeout:7000});assert.deepEqual(errors,[]);
await page.evaluate(()=>window.__protocol.engine.reset());await page.setViewportSize({width:1280,height:800});await page.waitForFunction(()=>document.documentElement.dataset.layout==='medium');
console.log('Wide client camera and final step complete without a missing transform matrix: passed');
await page.setViewportSize({width:1024,height:768});await page.waitForFunction(()=>document.documentElement.dataset.layout==='tablet');
await page.evaluate(()=>window.__protocol.engine.seek(1,true));await page.waitForTimeout(120);await page.evaluate(()=>window.__protocol.engine.pause());
const pausedView=await page.locator('#network-svg').getAttribute('viewBox');
await page.screenshot({path:'qa/upgrade/paused-camera-tablet.png',fullPage:true});
assert.equal(await page.locator('#network-svg').getAttribute('viewBox'),pausedView,'a screenshot must not jump a paused camera to its target');
await page.evaluate(()=>window.__protocol.engine.reset());await page.setViewportSize({width:1280,height:800});await page.waitForFunction(()=>document.documentElement.dataset.layout==='medium');
console.log('Paused camera remains still through a full-page capture: passed');


await page.evaluate(async()=>{const p=window.__protocol;await p.prepareLesson('https');p.engine.setLesson(p.lessons.find(l=>l.id==='https'));p.openPacket(6)});await page.waitForTimeout(400);
assert.equal(await page.locator('.ins-tab').count(),4);assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'0');
assert.match(await page.locator('.hx-head').textContent(),/1,514/);
await page.keyboard.press(']');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'1');
await page.keyboard.press(']');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'2');
await page.keyboard.press('[');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'1');
await page.keyboard.press('End');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'3');assert.equal(await page.locator('.ins-layer').count(),1);assert.match(await page.locator('.ins-where').textContent(),/not a network frame/);
await page.keyboard.press('Escape');
for(const width of [1680,375])for(const theme of ['light','dark']){
 await page.setViewportSize({width,height:width===375?812:945});await page.waitForFunction(layout=>document.documentElement.dataset.layout===layout,width===375?'phone':'wide');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(t=>document.querySelector(`.theme-toggle [data-theme="${t}"]`).click(),theme);
 await page.evaluate(()=>window.__protocol.openPacket(6));await page.waitForTimeout(300);assert.equal(await page.locator('.ins-tab').count(),4);await page.screenshot({path:`qa/upgrade/segments-${width}-${theme}.png`});await page.keyboard.press('Escape');
}
await page.setViewportSize({width:1280,height:800});
for(const code of ['fr','ar','en']){
 await page.locator('[data-action=language]').click();await page.locator(`[data-locale="${code}"]`).click();await page.waitForFunction(c=>document.documentElement.lang===c,code);await page.waitForTimeout(500);
 assert.equal(await page.locator('tr[data-packet="0"] td:nth-child(6)').textContent(),'Standard query A www.example.com');
 assert.equal(await page.locator('.full-name').textContent(),'HTTP Secure');
 await page.evaluate(()=>window.__protocol.openPacket(0));assert.ok((await page.locator('.ins-name').allTextContents()).includes('Source'));
 if(code==='ar')assert.equal(await page.locator('html').getAttribute('dir'),'rtl');await page.keyboard.press('Escape');
}
console.log('Translated UI retains English packet Info, protocol names and field names: passed');
assert.deepEqual(errors,[]);console.log('Segment tabs, reassembly, keyboard navigation and both themes/widths: passed');
await browser.close();
