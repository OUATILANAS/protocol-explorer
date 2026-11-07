/** Isolate technical runs so addresses and protocol tokens retain reading order. */
export function isolate(value:string,rtl:boolean){
 if(!rtl||!value||/[\u2066-\u2069]/.test(value))return value;
 const rtlLetters=/[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;
 if(!rtlLetters.test(value))return '\u2066'+value+'\u2069';
 const text=value.replace(/[A-Za-z0-9][A-Za-z0-9._/:@+#%*=,()\[\]'’"−– -]*/g,run=>{
  let cut=run.trimEnd().replace(/[-,:;]+$/,'').length;
  const stack:{char:string;at:number}[]=[];for(let at=0;at<cut;at++){const char=run[at];if(char==='('||char==='[')stack.push({char,at});else if(char===')'||char===']'){const expected=char===')'?'(':'[';if(stack.at(-1)?.char!==expected){cut=at;break}stack.pop()}}if(stack.length)cut=Math.min(cut,stack[0].at);
  const technical=run.slice(0,cut);return technical?'\u2066'+technical+'\u2069'+run.slice(cut):run;
 });
 return '\u2067'+text+'\u2069';
}
