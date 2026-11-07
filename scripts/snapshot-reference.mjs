import{mkdir,writeFile}from'node:fs/promises';import{dirname,join}from'node:path';import{createHash}from'node:crypto';
const origin='https://protocol-explorer-alpha.vercel.app',root='qa/reference-33';const queue=['/'],seen=new Set(),assets=[];
while(queue.length){const path=queue.shift();if(seen.has(path))continue;seen.add(path);const response=await fetch(origin+path);if(!response.ok)throw Error(`${path}: ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer()),local=join(root,path==='/'?'index.html':path);await mkdir(dirname(local),{recursive:true});await writeFile(local,bytes);assets.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 if(/\.(?:js|css)$/.test(path)||path==='/'){
  const code=bytes.toString();for(const match of code.matchAll(/(?:["'`(])((?:\.?\.?\/|assets\/)[^\s"'`()<>]+\.(?:js|css|woff2?|svg|png|ico|webmanifest))(?:["'`)])/g)){
   const url=new URL(match[1].startsWith('assets/')?'/'+match[1]:match[1],origin+path);if(url.origin===origin&&!seen.has(url.pathname))queue.push(url.pathname);
  }
 }
}
await writeFile('qa/upgrade/reference-33-manifest.json',JSON.stringify({origin,capturedAt:new Date().toISOString(),assets},null,2)+'\n');console.log(`Captured ${assets.length} files, ${assets.reduce((n,a)=>n+a.bytes,0)} bytes`);
