import{upgradeStrings}from'../src/i18n/upgrade-strings';import quiz from'../src/learning/data/quiz.json';import glossary from'../src/learning/data/glossary-en.json';
import{ethernetLesson}from'../src/lessons/ethernet';
import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import{pathToFileURL}from'node:url';import{resolve}from'node:path';import en from'../src/i18n/en';import{lessons}from'../src/lessons';import{currentLessons}from'../src/lessons/current';import{explainField}from'../src/wire/field-explanations';import{authored}from'../src/lessons/current-prose';import legacyContent from'../src/lessons/legacy-content.json';
const files=readdirSync('src/i18n').filter(f=>f.endsWith('.locale.ts'));
const lessonText=[...lessons,...currentLessons,ethernetLesson].flatMap(l=>[l.title,l.overview.description,l.outro.title,l.outro.desc,l.outro.text,...l.steps.flatMap(s=>[s.title,s.desc,s.detail])]);
test('every visible UI key is declared in the English source',()=>{
 const sources=['src/main.ts',...readdirSync('src/ui').filter(f=>f.endsWith('.ts')).map(f=>'src/ui/'+f)];
 for(const file of sources){const text=readFileSync(file,'utf8');const keys=[...text.matchAll(/\bt\(['"]([\w-]+)['"]\)/g),...text.matchAll(/data-t-label="([\w-]+)"/g)].map(m=>m[1]);for(const key of keys)assert.ok(en.ui[key],`${file}: missing ${key}`)}
});
const fieldNotes=[...new Set(readdirSync('src/lessons/reference-models').filter(f=>f.endsWith('.json')).flatMap(file=>JSON.parse(readFileSync('src/lessons/reference-models/'+file,'utf8')).flatMap((recipe:any)=>recipe.layers.flatMap((layer:any)=>layer.fields.map((field:any)=>explainField(layer.id,field.name,field.value))))))];
const proseText=Object.values({...legacyContent,...authored}).flatMap(l=>[l.overview,l.outro,...l.steps]);
for(const file of files)test(`${file}: every UI key and lesson explanation has a translation`,async()=>{
 const locale=(await import(pathToFileURL(resolve('src/i18n',file)).href)).default;
 for(const[key,value]of Object.entries(en.ui)){assert.equal(typeof locale.ui[key],'string',`${file}: missing UI key ${key}`);assert.ok(locale.ui[key].trim(),`${file}: empty ${key}`);for(const token of value.match(/\{\w+\}/g)||[])assert.ok(locale.ui[key].includes(token),`${file}: missing placeholder ${token}`)}
 for(const text of upgradeStrings)for(const token of text.match(/\{\w+\}/g)||[])assert.ok(locale.text[text]?.includes(token),`${file}: missing feature placeholder ${token}`);
 for(const text of new Set([...lessonText.filter(s=>s!=='Loading lesson…'),...proseText,...fieldNotes,...upgradeStrings,...Object.keys(glossary.terms),...Object.values(glossary.terms),...Object.values(quiz.quiz).flatMap(questions=>questions.flatMap(q=>[q.q,q.why,...q.options]))]))assert.ok(locale.text[text]?.trim(),`${file}: missing lesson text ${text}`);
});
