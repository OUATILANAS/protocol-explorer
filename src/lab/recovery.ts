export type RecoveryKind='rto'|'pto'|'fast-retransmit';
/** Teaching model: initial RTT variance = RTT/2 and max ACK delay = 25ms. */
export function recoveryDelay(kind:RecoveryKind,rttMs:number,attempt:number){const rtt=Math.max(1,rttMs)/1000;if(kind==='fast-retransmit')return rtt;const initial=kind==='rto'?1:3*rtt+.025;return Math.min(60,initial*2**Math.max(0,Math.min(20,attempt)))}
