import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const screenshot=options=>page.screenshot({animations:'disabled',timeout:60000,...options});
const reference=JSON.parse(readFileSync('tests/fixtures/reference-packets.json','utf8'));
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext();const page=await context.newPage();const errors=[],report=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
const visible=async selector=>page.locator(selector).first().isVisible();
const dims=async selector=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}});
for(const[width,height]of (process.argv.includes('--captures-only')?[]:[[1680,945],[1280,800],[1024,768],[700,900],[375,812]])){
 await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__protocol);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
 assert.ok(await page.locator('#network-svg').evaluate(el=>el.getAttribute('viewBox').split(/\s+/).every(n=>Number.isFinite(Number(n)))));
 const layout=await page.evaluate(()=>document.documentElement.dataset.layout);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await visible('.drawer-btn'),width<1100);
 assert.equal(await visible('#sidebar-host .sidebar'),width>=1100);
 assert.equal(await visible('.osi'),width>=1440||width>=900&&width<1100);
 assert.equal(await visible('#now-dots'),layout!=='medium');
 assert.equal(await visible('.learning'),layout!=='phone');
 assert.equal(await visible('.credit'),true);
 assert.equal(await visible('.tagline'),width>=900);
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>document.querySelector(`.theme-toggle [data-theme="${theme}"]`).click(),theme);await page.waitForTimeout(250);
  assert.equal(await page.locator('tr[data-packet]:visible').count(),7);
  const primary=await page.locator('.play-btn').evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor}));
  assert.equal(primary.background,theme==='light'?'rgb(0, 60, 168)':'rgb(0, 65, 183)');
  assert.equal(primary.border,theme==='light'?'rgb(0, 60, 168)':'rgb(108, 153, 234)');
  await screenshot({path:`qa/corrections/overview-${width}-${theme}.png`,fullPage:true});
  await page.locator('[data-view=sequence]').click();await page.waitForTimeout(330);
  const sequence=await page.locator('.sequence-scroll').evaluate(el=>({scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:getComputedStyle(el).overflowX}));
  // The reference clips a 480px sequence canvas on phone; no horizontal scrollbar is exposed.
  assert.ok(sequence.scrollWidth<=sequence.clientWidth+1||sequence.clientWidth<480&&sequence.overflowX==='hidden');
  assert.ok(await page.locator('.seq-label').evaluateAll(els=>els.every(el=>Math.abs(Number(el.getAttribute('transform').match(/rotate\(([-\d.]+)/)?.[1]||0))<=90)));
  await screenshot({path:`qa/corrections/sequence-${width}-${theme}.png`,fullPage:true});
  await page.locator('tr[data-packet="0"]').click();await page.waitForTimeout(330);
  assert.equal(await page.locator('.simulation .inspector').count(),1);
  const rect=await dims('.inspector'),simulation=await dims('.simulation');
  if(width>=1100){assert.ok(Math.abs(rect.x-simulation.x)<=2);assert.ok(Math.abs(rect.y-simulation.y)<=2);assert.ok(Math.abs(rect.width-simulation.width)<=3);assert.ok(Math.abs(rect.height-simulation.height)<=3)}
  else{assert.ok(Math.abs(rect.x)<=1);assert.ok(Math.abs(rect.y)<=1);assert.ok(Math.abs(rect.width-width)<=1);assert.ok(Math.abs(rect.height-height)<=1)}
  assert.ok(await page.locator('.ins-layer summary em').allTextContents().then(x=>x.includes('192.168.1.10 → 8.8.8.8')));
  await page.locator('[data-field="0"]').hover();assert.equal(await page.locator('.hx.is-lit').count(),6);
  await page.locator('.hx[data-offset="26"]').hover();assert.equal(await page.locator('.hx.is-lit').count(),4);
  await screenshot({path:`qa/corrections/inspector-${width}-${theme}.png`,fullPage:true});
  await page.keyboard.press('Escape');
  await page.locator('[data-view=network]').click();
  if(width<1100){await page.locator('.drawer-btn').click();await page.waitForTimeout(480);assert.equal(await page.locator('.drawer').count(),1);assert.equal(await visible('.scrim'),true);await page.locator('[data-filter=core]').click();assert.equal(await page.locator('.proto-row').count(),4);await page.keyboard.press('Escape');await page.locator('.drawer-btn').click();await page.waitForTimeout(480);await page.locator('[data-filter=all]').click();await page.keyboard.press('Escape')}
  report.push({width,height,theme,layout,primary,inspector:rect,sequence});console.log('Verified',width,theme);
 }
 await page.evaluate(()=>window.scrollTo(0,0));await page.locator('[data-action=play]').click();await page.waitForTimeout(300);assert.equal(await page.locator('tr[data-packet]:visible').count(),0);assert.equal(await visible('.packet-empty'),true);
 await page.evaluate(()=>{const e=window.__protocol.engine;for(let i=0;i<200;i++)e.tick(1000)});assert.equal(await page.locator('tr[data-packet]:visible').count(),7);
}
await page.setViewportSize({width:1280,height:800});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__protocol);
await page.evaluate(()=>window.__protocol.engine.reset());await page.locator('body').click({position:{x:2,y:2}});await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);await page.keyboard.press(' ');await page.waitForTimeout(400);assert.match(await page.locator('.step-counter').textContent(),/2/);assert.equal(await page.locator('.side-body>h3').textContent(),'DNS Resolution');
for(const target of reference.lessons){
 await page.evaluate(id=>{const api=window.__protocol;api.engine.setLesson(api.lessons.find(l=>l.id===id))},target.id);
 assert.deepEqual(await page.locator('tr[data-packet]:visible').evaluateAll(rows=>rows.map(r=>{const c=r.querySelectorAll('td');return{time:c[1].textContent,src:c[2].textContent,dst:c[3].textContent,proto:c[4].textContent,info:c[5].textContent,size:c[6].textContent,lost:r.dataset.lost==='true',color:r.dataset.color}})),target.packets);
 await page.evaluate(()=>{const e=window.__protocol.engine;e.play();for(let i=0;i<600;i++)e.tick(1000)});assert.equal(await page.locator('tr[data-packet]:visible').count(),target.packets.length);
 console.log('Verified capture rows',target.id);for(let index=0;index<target.packets.length;index++){await page.evaluate(i=>window.__protocol.openPacket(i),index);await page.waitForTimeout(5);assert.ok(await visible('.inspector'));await page.keyboard.press('Escape')}
}
await page.evaluate(()=>{const a=window.__protocol;a.engine.setLesson(a.lessons.find(l=>l.id==='tcp'));a.switchView('sequence')});assert.equal(await page.locator('.seq-cross').count(),1);assert.match(await page.locator('.seq-arrow.is-lost .seq-line').evaluate(el=>getComputedStyle(el).strokeDasharray),/5(?:px)?,? 4(?:px)?/);assert.ok(await page.locator('.seq-label').evaluateAll(els=>els.every(el=>Math.abs(Number(el.getAttribute('transform').match(/rotate\(([-\d.]+)/)?.[1]||0))<=90)));
assert.deepEqual(errors,[]);writeFileSync(process.argv.includes('--captures-only')?'qa/corrections/browser-captures.json':'qa/corrections/browser.json',JSON.stringify({errors,checks:report},null,2));console.log('Correction browser checks passed:',report.length,'viewport/theme combinations and all 14 captures');await browser.close();
