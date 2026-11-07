import {defineConfig} from 'vite';
export default defineConfig({
 base:'./',
 build:{target:'es2022'},
 server:{port:5173,strictPort:true},
 plugins:[{
  name:'preserve-svg-unitless-offsets',
  generateBundle(_options,bundle){
   // SVG accepts unitless dash offsets. Keep their authored CSSOM form after minification.
   for(const output of Object.values(bundle))if(output.type==='asset'&&output.fileName.endsWith('.css')){
    output.source=String(output.source).replace(/(stroke-dashoffset:)(-?[\d.]+)px(?=[;}])/g,'$1$2');
   }
  },
 }],
});
