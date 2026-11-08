/** Upgrades are disabled together for reference comparisons. Read once per load. */
export type Feature='lab'|'compare'|'quiz'|'filter'|'glossary'|'capture'|'shortcuts'|'offline'|'deepLinks'|'newLessons'|'readablePlayback'|'guide'|'narration'|'efficientScene';
export function featurePolicy(search:string){
 const parity=new URLSearchParams(search).get('parity')==='1';
 return{parity,has:(_feature:Feature)=>!parity};
}
const policy=featurePolicy(typeof location==='undefined'?'':location.search);
export const PARITY=policy.parity;
export const has=policy.has;
