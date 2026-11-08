import{test}from'node:test';import assert from'node:assert/strict';
import{featurePolicy,type Feature}from'../src/features';
const features:Feature[]=['lab','compare','quiz','filter','glossary','capture','shortcuts','offline','deepLinks','newLessons','readablePlayback'];
test('parity disables every upgrade through one policy',()=>{
 for(const feature of features){assert.equal(featurePolicy('?parity=1').has(feature),false,feature);assert.equal(featurePolicy('').has(feature),true,feature)}
});
test('only the explicit parity=1 parameter selects parity',()=>{
 for(const query of ['?parity=0','?parity=true','?other=parity%3D1','?parity'])assert.equal(featurePolicy(query).parity,false,query);
 assert.equal(featurePolicy('?lesson=http&parity=1&lang=fr').parity,true);
});
test('a created policy stays fixed for its session',()=>{
 let query='?parity=1';const policy=featurePolicy(query);query='';
 assert.equal(policy.parity,true);assert.equal(policy.has('lab'),false);assert.equal(featurePolicy(query).has('lab'),true);
});
