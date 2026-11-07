/** Resolve delegated DOM events without assuming that their target is an Element. */
export function targetEl(event:Pick<Event,'target'>):Element|null {
 const target=event.target;
 if(typeof Element!=='undefined'&&target instanceof Element)return target;
 return typeof Node!=='undefined'&&target instanceof Node?target.parentElement:null;
}
