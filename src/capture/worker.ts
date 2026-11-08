import{parseCapture}from'./parse';import{decodeRecord}from'./decode';
self.onmessage=(event:MessageEvent<ArrayBuffer>)=>{try{const parsed=parseCapture(event.data);self.postMessage({records:parsed.records.map(decodeRecord),metadata:parsed.metadata})}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)})}};
