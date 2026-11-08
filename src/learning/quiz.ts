export interface Question{q:string;options:string[];answer:number;why:string;packet:number}
export interface QuizOption{text:string;original:number;correct:boolean}
export function shuffleOptions(question:Question,random:()=>number=Math.random):QuizOption[]{const result=question.options.map((text,original)=>({text,original,correct:original===question.answer}));for(let i=result.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));[result[i],result[j]]=[result[j],result[i]]}return result}
export function quizId(id:string){return id==='quic'?'http3':id}
export const quizLessons=new Set(['http','https','http3','websocket','tcp','udp','ip','ipv6','ethernet','wifi','dns','doh','dhcp','icmp','smtp','pop3','imap','ftp','ssh','tls','webrtc','bgp','dnssec','ntp','wpa3','radius','portal','smb','proxy','socks','reverse','wireguard','ipsec','modbus']);
export async function loadQuiz(id:string){const data=(await import('./data/quiz.json')).default.quiz as Record<string,Question[]>;const questions=data[quizId(id)]||[];return questions.map((q,index)=>({...q,packet:q.packet}))}
