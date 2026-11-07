import{layer,field}from'./common';import{concat,u32}from'./checksum';import{text}from'./text';
const str=(s:string)=>{const b=new TextEncoder().encode(s);return concat(u32(b.length),b)};
export function ssh(kind:'banner'|'kexinit'|'init'|'reply'|'newkeys'|'encrypted',size=80){if(kind==='banner')return text('SSH','SSH-2.0-ProtocolExplorer_1.0\r\n','teal');if(kind==='encrypted'){const bytes=Uint8Array.from({length:size},(_,i)=>(i*71+19)%256);return layer('SSH','teal',bytes,[field('Encrypted SSH packet','Opaque data','Packet length, payload and authentication tag depend on the negotiated cipher. These bytes are illustrative.',0,size)],Array.from({length:size},(_,i)=>i))}const type={kexinit:20,init:30,reply:31,newkeys:21}[kind];let payload:Uint8Array;if(kind==='kexinit'){payload=concat(new Uint8Array([type]),new Uint8Array(16).fill(27),...['curve25519-sha256','ssh-ed25519','aes128-ctr','aes128-ctr','hmac-sha2-256','hmac-sha2-256','none','none','',''].map(str),new Uint8Array(5))}else if(kind==='init'){payload=concat(new Uint8Array([type]),u32(32),new Uint8Array(32).fill(42))}else if(kind==='reply'){const host=concat(str('ssh-ed25519'),u32(32),new Uint8Array(32).fill(52));const sig=concat(str('ssh-ed25519'),u32(64),new Uint8Array(64).fill(62));payload=concat(new Uint8Array([type]),u32(host.length),host,u32(32),new Uint8Array(32).fill(42),u32(sig.length),sig)}else payload=new Uint8Array([type]);let pad=8-((5+payload.length)%8);if(pad<4)pad+=8;const bytes=concat(u32(payload.length+pad+1),new Uint8Array([pad]),payload,new Uint8Array(pad).fill(41));return layer('SSH','teal',bytes,[field('Packet length',String(bytes.length-4),'Length excluding this four-byte field.',0,4),field('Padding length',String(pad),'At least four random padding bytes align the transport packet.',4,1),field('Message number',String(type),'Identifies the SSH message kind.',5,1),...(payload.length>1?[field('Message payload',kind==='kexinit'?'Algorithms: curve25519-sha256, ssh-ed25519, aes128-ctr, hmac-sha2-256':kind==='init'?'Client ephemeral X25519 public key':'Server host key, ephemeral key and signature','The unencrypted key-exchange payload; values are illustrative.',6,payload.length-1,kind!=='kexinit')]:[]),field('Random padding',`${pad} bytes`,'Illustrative padding; every real exchange uses fresh randomness.',5+payload.length,pad,true)],Array.from({length:pad},(_,i)=>5+payload.length+i))}

/** Encode the reference's hybrid SSH setup, using opaque example public keys. */
export function sshCapture(kind:'kexinit'|'init'|'reply'|'newkeys',length:number){
 let payload:Uint8Array;const type={kexinit:20,init:30,reply:31,newkeys:21}[kind];
 if(kind==='kexinit'){
  const algorithms=['sntrup761x25519-sha512@openssh.com,curve25519-sha256','ssh-ed25519','chacha20-poly1305@openssh.com','chacha20-poly1305@openssh.com','hmac-sha2-256','hmac-sha2-256','none','none','',''];
  const base=1+16+algorithms.reduce((n,s)=>n+4+s.length,0)+5;
  // A vendor algorithm identifier fills the captured proposal length; never ciphertext.
  const extra=length-5-8-base;
  if(extra<0)throw Error('SSH KEXINIT size');
  if(extra>0)algorithms[0]+=','+'x'.repeat(extra-1);
  payload=concat(new Uint8Array([type]),new Uint8Array(16).fill(27),...algorithms.map(str),new Uint8Array(5));
 }else if(kind==='init')payload=concat(new Uint8Array([type]),u32(1190),new Uint8Array(1190).fill(42));
 else if(kind==='reply'){
  const host=concat(str('ssh-ed25519'),u32(32),new Uint8Array(32).fill(52));
  const signature=concat(str('ssh-ed25519'),u32(64),new Uint8Array(64).fill(62));
  payload=concat(new Uint8Array([type]),u32(host.length),host,u32(1071),new Uint8Array(1071).fill(42),u32(signature.length),signature);
 }else payload=new Uint8Array([type]);
 const pad=length-5-payload.length;if(pad<4||pad>255)throw Error(`SSH padding ${pad}`);
 const b=concat(u32(length-4),new Uint8Array([pad]),payload,new Uint8Array(pad).fill(41));
 return layer('SSH','teal',b,[field('Packet length',String(length-4),'Length excluding the four-byte packet length.',0,4),field('Padding length',String(pad),'Random alignment bytes; illustrated deterministically here.',4,1),field('Message number',String(type),'The SSH transport message kind.',5,1),...(payload.length>1?[field('Message payload',kind==='kexinit'?'Algorithm proposal · sntrup761x25519-sha512@openssh.com':kind==='init'?'sntrup761 public key + X25519 public key':'Host key + SNTRUP ciphertext + X25519 public key + signature','The lesson uses illustrative algorithm proposals and key bytes.',6,payload.length-1,true)]:[]),field('Padding',`${pad} bytes`,'Fresh random bytes in a real capture.',5+payload.length,pad,true)],kind==='kexinit'?Array.from({length:16},(_,i)=>i+6).concat(Array.from({length:pad},(_,i)=>5+payload.length+i)):Array.from({length:b.length-6},(_,i)=>i+6));
}
