import{readFile,writeFile,readdir,copyFile}from'node:fs/promises';import{parseSync}from'rolldown/experimental';
const root='src/i18n',files=(await readdir(root)).filter(f=>f.endsWith('.locale.ts'));
const manifest=JSON.parse(await readFile('qa/upgrade/reference-33-manifest.json'));
const norm=s=>s.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
const enText=await readFile(root+'/en.ts','utf8');
// UI source is authored locally. Parse its string values without executing code.
const ast=parseSync('en.ts',enText).program,uiNode=ast.body.flatMap(n=>n.declaration?.declarations||n.declarations||[]).find(d=>d.id?.name==='ui');
const english=Object.fromEntries(uiNode.init.properties.map(p=>[p.key.name??p.key.value,p.value.value]));
for(const file of files){const code=file.slice(0,-10),staged=`qa/upgrade/translated-locales/${code}.ts`;let source;try{source=await readFile(staged,'utf8')}catch{source=await readFile(root+'/'+file,'utf8')}
 const data=JSON.parse(source.split('export default ')[1].trim().replace(/;$/,''));
 const asset=manifest.assets.find(a=>new RegExp(`^/assets/${code.replace('-','\\-')}-[^/]+\\.js$`).test(a.path));
 if(!asset)throw Error('Missing captured native locale '+code);
 const tree=parseSync(asset.path,await readFile('qa/reference-33'+asset.path,'utf8')).program;let native={};
 for(const n of tree.body)for(const d of n.declarations||[])if(d.init?.type==='ObjectExpression'){
  const entries=d.init.properties.filter(p=>p.key&&p.value?.type==='Literal'&&typeof p.value.value==='string').map(p=>[p.key.name??p.key.value,p.value.value]);native={...native,...Object.fromEntries(entries.filter(([key])=>key.length<=60))};
 }
 const lookup=new Map(Object.entries(native).map(([k,v])=>[norm(k),v]));
 for(const[key,value]of Object.entries(english))if(!['stepWord','overviewWord','of','steps','packet'].includes(key)&&lookup.has(norm(value)))data.ui[key]=lookup.get(norm(value));
 for(const key of Object.keys(data.text))if(key.length<=60&&lookup.has(norm(key)))data.text[key]=lookup.get(norm(key));
 for(const[key,value]of Object.entries(native))if(key.length<=60)data.text[key]=value;
 for(const[key,value]of Object.entries(english)){let i=0;const tokens=value.match(/\{\w+\}/g)||[];data.ui[key]=data.ui[key].replace(/\{[^}]+\}/g,part=>tokens[i++]||part)}
 for(const value of ['ACK','ARP','AEAD','ALPN','CA','CCMP','DAD','DNSSEC','DoH','ECH','EDNS','FIN','MSS','MTU','MX','NAT','PTK','QUIC','RRSIG','RTT','SACK','SAE','SLAAC','SNI','SSID','SYN','TLS','TTL','UDP','DNS'])if(!data.text[value])data.text[value]=value;
 const quiz=JSON.parse(await readFile('src/learning/data/quiz.json','utf8'));for(const qs of Object.values(quiz.quiz))for(const q of qs)for(const value of q.options)if(/^\d[\d.: /-]*$/.test(value)||/^(TCP|UDP|TLS|HTTP|IPv4|IPv6|ICMP|DNS)$/.test(value))data.text[value]=value;
 for(const key of Object.keys(data.text))if(/\{[a-z]+\}/.test(key))data.text[key]=data.text[key].replace('{ए}','{a}').replace('{एन}','{n}').replace('{बी}','{b}');
 // Counters differ grammatically from the STEP transport button in several languages.
 const counter=native['STEP {n}'];if(counter)data.ui.stepWord=counter.split('{n}')[0].trim();
 await writeFile(root+'/'+file,'// review: newly authored lesson translations are machine drafts.\nexport default '+JSON.stringify(data)+';\n');console.log(code,'keys',Object.keys(data.text).length);
}
