import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
test('sharing and discovery use the canonical production origin',()=>{
 const origin='https://protocol-explorer-hamada.vercel.app',html=readFileSync('index.html','utf8');
 assert.ok(html.includes(`<link rel="canonical" href="${origin}/">`));
 for(const tag of ['property="og:image"','name="twitter:image"'])assert.ok(html.includes(`${tag} content="${origin}/og.png"`));
 assert.ok(html.includes(`property="og:url" content="${origin}/"`));
 assert.equal(readFileSync('public/robots.txt','utf8'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
 const sitemap=readFileSync('public/sitemap.xml','utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,1);assert.ok(sitemap.includes(`<loc>${origin}/</loc>`));assert.ok(!sitemap.includes('#'));
});
