import{read,write}from'./storage';
export type Status='in-progress'|'complete';
const saved=read<unknown>('progress:v1',{}),ids=['http','https','tcp','udp','ip','dns','dhcp','icmp','smtp','pop3','imap','ftp','ssh','tls'];
export const progress:Record<string,Status>=saved&&typeof saved==='object'?Object.fromEntries(Object.entries(saved).filter(([id,status])=>ids.includes(id)&&(status==='in-progress'||status==='complete'))):{};
export function mark(id:string,status:Status){if(progress[id]==='complete')return;progress[id]=status;write('progress:v1',progress)}
export function totals(){return{complete:Object.values(progress).filter(x=>x==='complete').length,active:Object.values(progress).filter(x=>x==='in-progress').length}}

const savedFractions=read<unknown>('progress-steps:v1',{});
export const fractions:Record<string,number>=savedFractions&&typeof savedFractions==='object'?Object.fromEntries(Object.entries(savedFractions).filter(([id,value])=>ids.includes(id)&&typeof value==='number'&&value>=0&&value<=1)):{};
export function advance(id:string,fraction:number){if(progress[id]==='complete'||fraction<=(fractions[id]||0))return;fractions[id]=fraction;write('progress-steps:v1',fractions)}
