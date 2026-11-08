import {defineConfig} from 'vite';
import{createHash}from'node:crypto';import{readdirSync}from'node:fs';
export default defineConfig({
 base:'./',
 build:{target:'es2022'},
 server:{port:5173,strictPort:true},
 plugins:[{
 name:'offline-precache',
 generateBundle:{order:'post',handler(_options,bundle){
  const paths=[...new Set(['./','index.html',...Object.keys(bundle),...readdirSync('public',{recursive:true,withFileTypes:true}).filter(f=>f.isFile()).map(f=>{const parent=f.parentPath||'public';return parent.slice('public'.length).replace(/^\//,'')+(parent==='public'?'':'/')+f.name})])];
  const version=createHash('sha256').update(JSON.stringify(paths)).digest('hex').slice(0,16);
  const source=`const CACHE='protocol-explorer-${version}',FILES=${JSON.stringify(paths)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('protocol-explorer-')&&key!==CACHE).slice(0,-1).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.searchParams.get('parity')==='1')return;if(request.mode==='navigate'){event.respondWith(fetch(request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(new URL('index.html',self.registration.scope),response.clone())}return response}).catch(()=>caches.open(CACHE).then(cache=>cache.match(new URL('index.html',self.registration.scope)))));return}event.respondWith(caches.open(CACHE).then(cache=>cache.match(request,{ignoreSearch:true})).then(hit=>hit||caches.match(request,{ignoreSearch:true})).then(hit=>hit||fetch(request).catch(error=>{if(request.mode==='navigate')return caches.match(new URL('index.html',self.registration.scope));throw error})))})`;
  this.emitFile({type:'asset',fileName:'sw.js',source});
 }}
},{
  name:'preserve-svg-unitless-offsets',
  generateBundle(_options,bundle){
   // SVG accepts unitless dash offsets. Keep their authored CSSOM form after minification.
   for(const output of Object.values(bundle))if(output.type==='asset'&&output.fileName.endsWith('.css')){
    output.source=String(output.source).replace(/(stroke-dashoffset:)(-?[\d.]+)px(?=[;}])/g,'$1$2');
   }
  },
 }],
});
