import{tr}from'../i18n';
let timer:ReturnType<typeof setTimeout>|undefined;
export function toast(message:string){let host=document.querySelector<HTMLElement>('.upgrade-toast');if(!host){host=document.createElement('div');host.className='toast upgrade-toast';host.setAttribute('role','status');host.setAttribute('aria-live','polite');document.body.append(host)}host.textContent=tr(message);clearTimeout(timer);timer=setTimeout(()=>host?.remove(),3500)}
