export type Color='blue'|'green'|'amber'|'violet'|'teal'|'slate';
export type NodeId='client'|'router'|'dns'|'internet'|'web'|'root'|'tld'|'auth'|'mx'|'relay'|'app'|'lan'|'isp'|'transit'|'hosting'|'remote'|'peer'|'switch'|'desktop';
export type Frame='client'|'local'|'lookup'|'full'|'root'|'tld'|'path'|'mailhost'|'backend'|'bgp'|'call'|'office'|'relay'|'route';
export type LessonId='http'|'https'|'tcp'|'udp'|'ip'|'dns'|'dhcp'|'icmp'|'smtp'|'pop3'|'imap'|'ftp'|'ssh'|'tls'|'websocket'|'webrtc'|'quic'|'bgp'|'ipv6'|'doh'|'dnssec'|'ntp'|'wifi'|'wpa3'|'radius'|'portal'|'smb'|'proxy'|'socks'|'reverse'|'wireguard'|'ipsec'|'modbus'|'ethernet';
export type Fact=[string,string];
export interface Field{inlineNote?:boolean;name:string;value:string;note:string;eg?:boolean;depth?:number;offset:number;length:number}
export interface Layer{name:string;color:Color;fields:Field[];bytes:Uint8Array;opaque?:number[]}
export interface WireFrame{layers:Layer[];bytes:Uint8Array;frames?:WireFrame[];segments?:WireFrame[];reassembled?:WireFrame}
export interface PacketEvent{type:'packet'|'handshake'|'ccs'|'appdata';from:NodeId;to:NodeId;color:Color;tag:string;lines:string[];row:{time:string;src:string;dst:string;proto:string;info:string;len:string};wire:()=>WireFrame;lost?:boolean;labStatus?:'lost'|'resent';labRecovery?:'rto'|'pto'|'fast-retransmit';sequence?:{at:number;latency:number;labelFraction?:number}}
export type Event={type:'label';at:NodeId;label:[string,string]}|{type:'wait';duration:number}|{type:'hide-url'}|{type:'loaded-url';text:string}|{type:'show';nodes:NodeId[];frame?:Frame}|{type:'camera';frame:Frame}|{type:'type-url';text:string}|{type:'note';at:NodeId;text:string;tone?:Color}|PacketEvent;
export interface Step{title:string;desc:string;detail:string;facts:Fact[];events:Event[]}
export interface Lesson{labTiming?:number;drawerFull?:string;id:LessonId;name:string;title:string;layer:1|2|3|4|5|6|7;category:'core'|'application'|'security';nodes:NodeId[];nodeLabels?:Partial<Record<NodeId,string>>;latency:Record<string,number>;legend:[Color|null,string][];overview:{full:string;description:string;facts:Fact[]};outro:{title:string;desc:string;text:string;facts:Fact[]};start:{nodes:NodeId[];frame:Frame};playback?:{packetGap:number;stepGap:number;urlHold:number;characterTime:number};steps:Step[]}
export const isPacket=(e:Event):e is PacketEvent=>'from' in e;
export interface Scene{nodes:NodeId[];frame:Frame;url:string;urlVisible?:boolean;urlLoaded?:boolean;urlTyping?:boolean;labels?:Partial<Record<NodeId,[string,string]>>;notes:{at:NodeId;text:string;tone:Color}[];packets:PacketEvent[];active:PacketEvent|null;fraction:number}
