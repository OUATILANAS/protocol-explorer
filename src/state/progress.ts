import{read,write}from'./storage';
export type Status='in-progress'|'complete';
const saved=read<unknown>('progress:v1',{}),ids=['http','https','tcp','udp','ip','dns','dhcp','icmp','smtp','pop3','imap','ftp','ssh','tls'];
export const progress:Record<string,Status>=saved&&typeof saved==='object'?Object.fromEntries(Object.entries(saved).filter(([id,status])=>ids.includes(id)&&(status==='in-progress'||status==='complete'))):{};
export function mark(id:string,status:Status){if(progress[id]==='complete')return;progress[id]=status;write('progress:v1',progress)}
export function totals(){return{complete:Object.values(progress).filter(x=>x==='complete').length,active:Object.values(progress).filter(x=>x==='in-progress').length}}
