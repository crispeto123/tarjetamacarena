const crypto=require('node:crypto');
const hashes=new WeakMap();
function hashValue(value){if(value&&typeof value==='object'){let h=hashes.get(value);if(!h){h=crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);hashes.set(value,h);}return h;}return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);}
module.exports=function(state,header){
 let base;try{base=JSON.parse(header);}catch{return null;}
 if(!base||typeof base!=='object'||Array.isArray(base))return null;
 const parts={};for(const [key,value] of Object.entries(state)){if(key==='cards'){for(const [id,card] of Object.entries(value))parts['card:'+id]=card;}else parts[key]=value;}
 const manifest={},patch={};for(const [key,value] of Object.entries(parts)){const hash=hashValue(value);manifest[key]=hash;if(base[key]!==hash)patch[key]=value;}
 return {stateDelta:true,manifest,patch,removed:Object.keys(base).filter(key=>!Object.hasOwn(parts,key))};
};
