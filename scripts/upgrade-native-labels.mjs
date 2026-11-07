// Inspect short UI labels only; never import or execute the reference bundle.
import{writeFile}from'node:fs/promises';import{parseSync}from'rolldown/experimental';import en from'../src/i18n/en.ts';
const reference='https://protocol-explorer-alpha.vercel.app/';
const html=await(await fetch(reference)).text();
const bundle=html.match(/<script[^>]+src="([^"]+\.js)"/)[1];
const source=await(await fetch(new URL(bundle,reference))).text();
const assets=[...source.matchAll(/import\("\.\/((?:es|pt|fr|de|tr|uk|id|ja|zh|zh-TW|ko|hi|ar|he)-[^"/]+\.js)"\)/g)].map(m=>m[1]);
const norm=s=>s.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
const records=await Promise.all(assets.map(async asset=>{
 const code=await(await fetch('https://protocol-explorer-alpha.vercel.app/assets/'+asset)).text();
 const ast=parseSync(asset,code).program;let dictionary;
 for(const statement of ast.body)for(const declaration of statement.declarations||[]){
  if(declaration.init?.type!=='ObjectExpression')continue;
  const entries=declaration.init.properties.filter(p=>p.value?.type==='Literal'&&typeof p.value.value==='string').map(p=>[p.key.name??p.key.value,p.value.value]);
  if(entries.some(([k])=>k==='PLAY'))dictionary=Object.fromEntries(entries.filter(([k])=>k.length<=60));
 }
 if(!dictionary)throw Error('No UI dictionary in '+asset);
 const map=new Map(Object.entries(dictionary).map(([k,v])=>[norm(k),v]));
 return{locale:asset.match(/^(zh-TW|[a-z]+)/)[1],asset,ui:Object.fromEntries(Object.entries(en.ui).filter(([,v])=>map.has(norm(v))).map(([k,v])=>[k,map.get(norm(v))])),missing:Object.keys(en.ui).filter(k=>!map.has(norm(en.ui[k]))),text:dictionary};
}));
await writeFile('qa/upgrade/native-short-labels.json',JSON.stringify(records,null,2));console.log(records.map(r=>`${r.locale}: ${Object.keys(r.ui).length} UI matches; ${r.missing.join(', ')}`).join('\n'));
