import{writeFileSync}from'node:fs';import{lessons}from'../src/lessons';import{isPacket}from'../src/types';
writeFileSync('src/lessons/legacy-content.json',JSON.stringify(Object.fromEntries(lessons.map(l=>[l.id,{overview:l.overview.description,outro:l.outro.text,steps:l.steps.map(s=>s.detail)}])))+'\n');
const http=lessons[0];writeFileSync('src/lessons/http-calibration.json',JSON.stringify({playback:http.playback,steps:http.steps.map(s=>s.events.map(e=>isPacket(e)?{type:'packet',sequence:e.sequence}:e))})+'\n');
