import type{Layer,Color,Field,WireFrame}from'../types';import{concat}from'./checksum';
export function field(name:string,value:string,note:string,offset:number,length:number,eg=false):Field{return{name,value,note,offset,length,eg}}
export function layer(name:string,color:Color,bytes:Uint8Array,fields:Field[],opaque?:number[]):Layer{return{name,color,bytes,fields,opaque}}
export function frame(layers:Layer[]):WireFrame{return{layers,bytes:concat(...layers.map(l=>l.bytes))}}
export const ETH_HEADER=14,IP_HEADER=20,TCP_HEADER=20,UDP_HEADER=8,MSS=1460;
