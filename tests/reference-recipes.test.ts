import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{encodeRecipe,type PacketRecipe}from'../src/wire/recipe';import{checksum,concat,pseudo}from'../src/wire/checksum';
const targets=JSON.parse(readFileSync('tests/fixtures/reference-33-packets.json','utf8'));
function load(id:string):PacketRecipe[]{return JSON.parse(readFileSync(`src/lessons/reference-models/${id}.json`,'utf8'))}
const view=(b:Uint8Array)=>new DataView(b.buffer,b.byteOffset,b.byteLength);
for(const lesson of targets.lessons)test(`${lesson.id}: current capture lengths, field coverage and checksums`,()=>{
 const recipes=load(lesson.id);assert.equal(recipes.length,lesson.packets.length);
 recipes.forEach((recipe,index)=>{
  const wire=encodeRecipe(recipe),target=lesson.packets[index];
  assert.equal(target.len,target.len.endsWith('KB')?`${(wire.bytes.length/1024).toFixed(1)} KB`:`${wire.bytes.length} B`,`${lesson.id} packet ${index+1}`);
  for(const part of wire.segments||[wire]){
   assert.equal(part.bytes.length,part.layers.reduce((n,l)=>n+l.bytes.length,0));
   for(const layer of part.layers){
    const covered=new Uint8Array(layer.bytes.length);
    for(const f of layer.fields){assert.ok(f.note.trim());assert.ok(f.offset>=0&&f.length>=0&&f.offset+f.length<=layer.bytes.length,`${layer.name}/${f.name}`);covered.fill(1,f.offset,f.offset+f.length)}
    assert.ok(covered.every(Boolean),`${lesson.id} ${index+1}: uncovered ${layer.name}`);
    assert.ok((layer.opaque||[]).every(n=>n>=0&&n<layer.bytes.length));
   }
   const network=part.layers.find(l=>l.name==='IPv4'||l.name==='IPv6');if(!network)continue;
   const ipv4=network.name==='IPv4',n=part.layers.indexOf(network),transport=concat(...part.layers.slice(n+1).filter(l=>l.name!=='Ethernet padding').map(l=>l.bytes));
   assert.equal(view(network.bytes).getUint16(ipv4?2:4),transport.length+(ipv4?network.bytes.length:0));
   if(ipv4)assert.equal(checksum(network.bytes),0);
   const protocol=network.bytes[ipv4?9:6];
   if(protocol===1){assert.equal(checksum(transport),0);continue}
   if(![6,17,58].includes(protocol))continue;
   if(protocol===17&&view(transport).getUint16(6)===0&&!ipv4)assert.fail('IPv6 UDP checksum cannot be disabled');
   if(protocol===17&&recipe.udpChecksumDisabled)continue;
   const prefix=ipv4?pseudo(Array.from(network.bytes.slice(12,16)).join('.'),Array.from(network.bytes.slice(16,20)).join('.'),protocol,transport.length):concat(network.bytes.slice(8,40),new Uint8Array([transport.length>>>24,transport.length>>>16&255,transport.length>>>8&255,transport.length&255,0,0,0,protocol]));
   assert.equal(checksum(concat(prefix,transport)),0,`${lesson.id} packet ${index+1}: transport checksum`);
   if(protocol===6)assert.ok(view(network.bytes).getUint16(ipv4?2:4)+(ipv4?0:40)<=1500);
  }
  if(wire.reassembled){const actual=concat(...wire.segments!.flatMap(f=>{const at=f.layers.findIndex(l=>l.name==='TCP');return f.layers.slice(at+1).filter(l=>l.name!=='Ethernet padding').map(l=>l.bytes)}));assert.deepEqual(actual,wire.reassembled.bytes)}
 });
});
test('MSS and TTL variations recompute segmentation and checksums',()=>{
 const recipe=load('https')[6],normal=encodeRecipe(recipe),small=encodeRecipe(recipe,{mss:512,ttl:32});assert.ok(small.segments!.length>normal.segments!.length);
 let expected:number|undefined;
 for(const frame of small.segments!){const ip=frame.layers.find(l=>l.name==='IPv4')!,tcp=frame.layers.find(l=>l.name==='TCP')!,v=view(tcp.bytes);assert.equal(ip.bytes[8],32);assert.equal(checksum(ip.bytes),0);const sequence=v.getUint32(4);if(expected!==undefined)assert.equal(sequence,expected);expected=sequence+frame.bytes.length-14-ip.bytes.length-tcp.bytes.length}
 assert.deepEqual(small.reassembled!.bytes,normal.reassembled!.bytes);
});
test('recipes reject malformed field inputs',()=>{
 const recipe=load('http')[0];assert.throws(()=>encodeRecipe({...recipe,layers:[{...recipe.layers[0],parts:[['uint',1,'256']]}]}),/does not fit/);
 assert.throws(()=>encodeRecipe({...recipe,layers:[{...recipe.layers[0],fields:[{name:'bad',value:'x',offset:-1,length:2}]}]}));
});
