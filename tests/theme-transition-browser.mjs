import{chromium}from'playwright';
import assert from'node:assert/strict';
import{mkdir,writeFile}from'node:fs/promises';
const local=process.env.THEME_LOCAL_URL||'http://127.0.0.1:5173/',reference='https://protocol-explorer-alpha.vercel.app/';
const browser=await chromium.launch(),results=[];
try{
 for(const width of[1280,375])for(const reduced of[false,true]){
  const captures=[];
  for(const [name,url,attribute]of[['reference',reference,'data-theme-choice'],['local',local,'data-theme']]){
   const page=await browser.newPage({viewport:{width,height:812},colorScheme:'light',reducedMotion:reduced?'reduce':'no-preference'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('protocol-explorer:theme','light');localStorage.setItem('protocol-explorer:lang','en');window.themeAnimations=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const animation=animate.call(this,frames,options);if(options?.pseudoElement==='::view-transition-new(root)')window.themeAnimations.push({frames,options});return animation}});
   await page.goto(url,{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   for(const theme of['dark','light']){
    const control=page.locator('.theme-toggle ['+attribute+'='+theme+']'),bounds=await control.boundingBox();
    await control.click();await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);
    if(!reduced){await page.waitForFunction(n=>themeAnimations.length===n,theme==='dark'?1:2);const motion=await page.evaluate(()=>themeAnimations.at(-1)),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2,r=Math.hypot(Math.max(x,width-x),Math.max(y,812-y));assert.deepEqual(motion.frames.clipPath,[`circle(0px at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]);assert.equal(motion.options.duration,650);assert.equal(motion.options.easing,'cubic-bezier(0.16, 1, 0.3, 1)');await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.pseudoElement==='::view-transition-new(root)').map(a=>a.finished.catch(()=>{}))))}
    else assert.equal(await page.evaluate(()=>themeAnimations.length),0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('protocol-explorer:theme')),theme);
   }
   const motions=await page.evaluate(()=>themeAnimations);captures.push({name,motions});assert.deepEqual(errors,[]);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>themeAnimations.length),0,'reload must not animate');
   if(name==='local'&&width===1280&&!reduced){await page.locator('[data-theme=dark]').click();await page.waitForTimeout(100);await page.locator('[data-theme=light]').click();await page.waitForTimeout(800);assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.deepEqual(errors,[])}
   await page.close();
  }
  let maxGeometryDelta=0;assert.equal(captures[1].motions.length,captures[0].motions.length);for(const[i,motion]of captures[1].motions.entries()){const target=captures[0].motions[i];assert.deepEqual(motion.options,target.options);for(const[j,clip]of motion.frames.clipPath.entries()){const actual=clip.match(/[0-9.]+/g).map(Number),expected=target.frames.clipPath[j].match(/[0-9.]+/g).map(Number);assert.equal(actual.length,expected.length);actual.forEach((value,k)=>{const delta=Math.abs(value-expected[k]);maxGeometryDelta=Math.max(maxGeometryDelta,delta);assert.ok(delta<=.05,'button-center geometry differs by '+delta+'px')})}}results.push({width,reduced,matchedReference:true,maxGeometryDelta});
 }
 const page=await browser.newPage();await page.addInitScript(()=>{localStorage.setItem('protocol-explorer:theme','light');document.startViewTransition=undefined});await page.goto(local,{waitUntil:'networkidle'});await page.locator('[data-theme=dark]').click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');await page.close();
 await mkdir('qa/upgrade',{recursive:true});await writeFile('qa/upgrade/theme-transition.json',JSON.stringify({checkedAt:new Date().toISOString(),reference,results,unsupportedBrowserFallback:'pass',rapidSwitch:'pass',reloadWithoutAnimation:'pass'},null,2)+'\n');console.log('Theme reveal matches live reference on desktop/phone in both directions; reduced motion, rapid switches, persistence and unsupported API fallback pass');
}finally{await browser.close()}
