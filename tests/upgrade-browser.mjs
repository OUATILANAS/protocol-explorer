import{chromium}from'playwright';import assert from'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
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
await page.evaluate(()=>{const p=window.__protocol;p.engine.setLesson(p.lessons.find(l=>l.id==='https'));p.openPacket(6)});await page.waitForTimeout(400);
assert.equal(await page.locator('.ins-tab').count(),4);assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'0');
assert.match(await page.locator('.hx-head').textContent(),/1,514/);
await page.keyboard.press(']');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'1');
await page.keyboard.press(']');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'2');
await page.keyboard.press('[');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'1');
await page.keyboard.press('End');assert.equal(await page.locator('.ins-tab[aria-selected=true]').getAttribute('data-segment'),'3');assert.equal(await page.locator('.ins-layer').count(),1);assert.match(await page.locator('.ins-where').textContent(),/not a network frame/);
await page.keyboard.press('Escape');
for(const width of [1680,375])for(const theme of ['light','dark']){
 await page.setViewportSize({width,height:width===375?812:945});await page.evaluate(t=>document.querySelector(`.theme-toggle [data-theme="${t}"]`).click(),theme);
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
