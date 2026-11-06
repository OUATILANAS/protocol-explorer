export function checksum(bytes:Uint8Array){let sum=0;for(let i=0;i<bytes.length;i+=2)sum+=(bytes[i]<<8)|(bytes[i+1]||0);while(sum>>>16)sum=(sum&65535)+(sum>>>16);return(~sum)&65535}
export const concat=(...parts:Uint8Array[])=>{const b=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){b.set(p,o);o+=p.length}return b};
export const u16=(n:number)=>new Uint8Array([n>>>8,n&255]);export const u32=(n:number)=>new Uint8Array([n>>>24,(n>>>16)&255,(n>>>8)&255,n&255]);
export const ip=(s:string)=>new Uint8Array(s.split('.').map(Number));export const hex=(n:number,len=4)=>'0x'+n.toString(16).padStart(len,'0');
export function pseudo(src:string,dst:string,proto:number,len:number){return concat(ip(src),ip(dst),new Uint8Array([0,proto]),u16(len))}
