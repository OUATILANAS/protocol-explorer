/** RFC 6455 accept token is derived from the client's nonce and the protocol GUID. */
export async function websocketAccept(key:string){const source=new TextEncoder().encode(key.trim()+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11'),digest=new Uint8Array(await crypto.subtle.digest('SHA-1',source));return btoa(Array.from(digest,n=>String.fromCharCode(n)).join(''))}
