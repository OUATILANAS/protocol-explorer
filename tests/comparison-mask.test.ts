import{test}from'node:test';import assert from'node:assert/strict';import{chromium}from'playwright';
import{collectPixelMasks,compareProseGeometry}from'../scripts/comparison-prose-mask.mjs';
test('pixel exclusions are limited to allowed prose and ignored credit; strict retains prose',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await page.setContent(`<p class="description">${'Original lesson explanation. '.repeat(5)}</p><p class="description" hidden>${'Hidden explanation. '.repeat(5)}</p><table><tr><td>${'Technical packet information. '.repeat(5)}</td></tr></table><div class="credit"><a>@Anas</a></div>`);
  const options={strict:false,ignoreSource:'@anas',ignoreFlags:'i'};
  const masks=await page.evaluate(collectPixelMasks,options);assert.deepEqual(masks.map(m=>m.kind),['lesson-prose','credit']);
  assert.deepEqual((await page.evaluate(collectPixelMasks,{...options,strict:true})).map(m=>m.kind),['credit']);
 }finally{await browser.close()}
});
test('prose exclusion still rejects moved, resized or missing explanation blocks',()=>{
 const mask={kind:'lesson-prose',rect:[20,40,200,100]};
 assert.deepEqual(compareProseGeometry([mask],[{...mask,rect:[20.5,40,200,100]}]),[]);
 assert.equal(compareProseGeometry([mask],[{...mask,rect:[22,40,200,100]}]).length,1);
 assert.equal(compareProseGeometry([mask],[{...mask,rect:[20,40,200,110]}]).length,1);
 assert.equal(compareProseGeometry([mask],[]).length,1);
});

test('field prose masks are clipped to their own scrolling tree',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage();await page.setContent('<div style="position:absolute;left:20px;top:20px;width:120px;height:60px;overflow:hidden"><p class="ins-note" style="width:300px;margin:0">An original field explanation.</p></div><span>Source</span>');const masks=await page.evaluate(collectPixelMasks,{strict:false,ignoreSource:'@anas',ignoreFlags:'i'});assert.equal(masks.length,1);assert.equal(masks[0].kind,'field-explanation');assert.ok(masks[0].rect[0]+masks[0].rect[2]<=140);assert.deepEqual(await page.evaluate(collectPixelMasks,{strict:true,ignoreSource:'@anas',ignoreFlags:'i'}),[]);}finally{await browser.close()}
});

test('a fixed inspector escapes its simulation overflow clip',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage();await page.setContent('<div style="width:100px;height:60px;overflow:hidden"><section style="position:fixed;inset:0"><div style="height:200px;overflow:auto"><p class="ins-note" style="position:absolute;top:100px;left:20px;margin:0">An explanation inside a fixed inspector.</p></div></section></div>');const masks=await page.evaluate(collectPixelMasks,{strict:false,ignoreSource:'@anas',ignoreFlags:'i'});assert.equal(masks.length,1);assert.equal(masks[0].rect[1],100);}finally{await browser.close()}
});
