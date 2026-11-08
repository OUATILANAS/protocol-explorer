import{currentLessons,prepareLesson}from'./current';import metadata from'./ethernet-metadata.json';import type{Lesson,LessonId}from'../types';import{has}from'../features';
const ethernet=metadata as unknown as Lesson;
export function catalog(upgrades:boolean){if(!upgrades)return currentLessons;const lessons=[...currentLessons];lessons.splice(lessons.findIndex(l=>l.id==='ipv6')+1,0,ethernet);return lessons}
export const appLessons=catalog(has('newLessons'));
let pendingEthernet:Promise<Lesson>|undefined;
export async function prepareAppLesson(id:LessonId){if(id!=='ethernet')return prepareLesson(id);if(!has('newLessons'))throw Error('Ethernet is not part of the parity catalog');return pendingEthernet??=import('./ethernet').then(module=>Object.assign(ethernet,module.ethernetLesson))}
export const upgradeLessonIds=new Set<LessonId>(['quic','websocket','ipv6','ethernet','wifi','doh']);
