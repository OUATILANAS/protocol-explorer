import{test}from'node:test';import assert from'node:assert/strict';import{chromium}from'playwright';import{targetEl}from'../src/state/event-target';
test('delegated targets safely resolve elements, text nodes, documents and windows',async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{const page=await browser.newPage();const result=await page.evaluate(source=>{
  const resolve=new Function(`return (${source})`)();
  const button=document.createElement('button');button.textContent='Open';document.body.append(button);
  const targets=[button,button.firstChild!,document,window];
  return targets.map(target=>{const e=new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true});target.dispatchEvent(e);const element=resolve(e);return element===button?'button':element===null?'null':'unexpected'});
 },targetEl.toString());assert.deepEqual(result,['button','button','null','null']);}finally{await browser.close()}
});
