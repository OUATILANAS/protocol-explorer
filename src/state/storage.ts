const prefix='protocol-explorer:';
export function read<T>(key:string,fallback:T):T{try{const v=localStorage.getItem(prefix+key);if(v===null)return fallback;try{return JSON.parse(v) as T}catch{return v as T}}catch{return fallback}}
export function write(key:string,value:unknown){try{localStorage.setItem(prefix+key,typeof value==='string'?value:JSON.stringify(value))}catch{}}
