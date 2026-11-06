import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1180,height:900}});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5173');
const out=[];
for(const theme of ['light','dark']) {
 await page.evaluate(()=>{window.__protocol.engine.reset()});
 await page.locator(`.theme-toggle [data-theme="${theme}"]`).click();
 for(const state of ['idle','complete','inspector','drawer']) {
  if(state==='complete')await page.evaluate(()=>{const e=window.__protocol.engine;e.play();for(let i=0;i<150;i++)e.tick(1000)});
  if(state==='inspector')await page.locator('tr[data-packet]').first().click();
  if(state==='drawer'){await page.keyboard.press('Escape');await page.locator('[data-action=drawer]').click()}
  const result=await new AxeBuilder({page}).analyze();
  out.push({theme,state,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,message:n.failureSummary}))}))});
 }
 await page.keyboard.press('Escape');
}
writeFileSync('qa/a11y.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
await browser.close();
