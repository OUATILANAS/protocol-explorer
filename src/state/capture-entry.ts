import{MAX_CAPTURE_BYTES}from'../capture/parse';
import{toast}from'../ui/toast';
let stop=()=>{},select:(id:string)=>void=()=>{},pending:Promise<typeof import('../ui/capture')>|undefined;
function viewer(){return pending??=import('../ui/capture').then(module=>{module.initializeCapture(stop,select);return module}).catch(error=>{pending=undefined;throw error})}
function open(file:File){if(!/\.pcap(ng)?$/i.test(file.name)){toast('Choose a .pcap or .pcapng file');return}if(file.size>MAX_CAPTURE_BYTES){toast('Capture exceeds 50 MB');return}toast('Loading');void viewer().then(module=>module.openCapture(file)).catch(()=>toast('Capture viewer could not load. Please try again.'))}
/** Keep the file picker synchronous with the click; defer the viewer until a file is chosen. */
export function chooseCaptureFile(){const input=document.createElement('input');input.type='file';input.accept='.pcap,.pcapng';input.onchange=()=>{if(input.files?.[0])open(input.files[0])};input.click()}
export function initializeCaptureEntry(pause:()=>void,lesson:(id:string)=>void){stop=pause;select=lesson;document.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault()});document.addEventListener('drop',event=>{const file=event.dataTransfer?.files[0];if(file){event.preventDefault();open(file)}})}
