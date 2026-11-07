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
await browser.close();
