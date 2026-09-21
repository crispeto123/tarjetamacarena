const fs=require('node:fs'),crypto=require('node:crypto');
// A successful return means both the payload and atomic replacement completed.
function writeJSON(file,value,io=fs,wait=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)){
 const temp=file+'.'+crypto.randomUUID()+'.tmp';
 try{io.writeFileSync(temp,JSON.stringify(value,null,2),{flush:true,flag:'wx'});for(let attempt=0;;attempt++){try{io.renameSync(temp,file);break;}catch(e){if(!['EPERM','EBUSY','EACCES'].includes(e.code)||attempt===6)throw e;wait(50*(attempt+1));}}}
 catch(cause){try{io.unlinkSync(temp);}catch{}const e=Error('No pudimos guardar todavía. Reintentaremos automáticamente.');e.status=503;e.cause=cause;throw e;}
}
module.exports={writeJSON};
