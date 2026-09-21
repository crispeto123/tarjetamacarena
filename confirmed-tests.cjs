const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),M=require('./model.cjs'),Sync=require('./sync.cjs'),Storage=require('./storage.cjs'),{Engine}=require('./public/offline.js');
class Store{async read(){return structuredClone(this.r);}async change(id,fn){this.r=fn(this.r);return structuredClone(this.r);}}
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'macarena-confirmed-')),file=path.join(dir,'atomic.json');fs.writeFileSync(file,'{"old":true}');let attempts=0;
 Storage.writeJSON(file,{new:true},{...fs,renameSync(a,b){if(attempts++<2)throw Object.assign(Error('locked'),{code:'EPERM'});fs.renameSync(a,b);}},()=>{});assert.equal(attempts,3);assert(JSON.parse(fs.readFileSync(file)).new);
 assert.throws(()=>Storage.writeJSON(file,{bad:true},{...fs,renameSync(){throw Object.assign(Error('locked'),{code:'EPERM'});}},()=>{}),e=>e.status===503);assert(JSON.parse(fs.readFileSync(file)).new);
 const s=M.seed();s.editing=true;Sync.migrate(s);const user=s.players[4],snapshot=()=>({...structuredClone(s),me:user.id,offlineUntil:Date.now()+60000,permissions:{G1:true}}),store=new Store();store.r={snapshot:snapshot(),pending:[]};let online=false;
 const transport=async(route,op)=>{if(!online)throw Error('no signal');if(route==='sync')Sync.apply(s,user,op);return snapshot();};let engine=new Engine({store,transport,waitForConfirmation:true});await engine.restore(user.id);
 await engine.queue('score',{groupId:'G1',hole:0,score:4});await engine.sync();await assert.rejects(engine.queue('score',{groupId:'G1',hole:1,score:3}),/Espere/);assert.equal(s.cards.G1.scores[0],null);
 store.r.pending[0].problem='EPERM: operation not permitted, rename';store.r.pending[0].status=400;
 engine=new Engine({store,transport,waitForConfirmation:true});await engine.restore(user.id);online=true;await engine.sync();assert.equal(engine.record.pending.length,0);assert.equal(s.cards.G1.scores[0],4);await engine.queue('score',{groupId:'G1',hole:1,score:3});await engine.sync();assert.equal(s.cards.G1.scores[1],3);
 // Inject seven consecutive replacement failures inside a real HTTP server.
 const initial=M.seed();fs.writeFileSync(path.join(dir,'macarena.json'),JSON.stringify(initial));
 const preload=path.join(dir,'fault.cjs');fs.writeFileSync(preload,"const fs=require('node:fs');const rename=fs.renameSync;let failures=7;fs.renameSync=function(a,b){if(String(b).endsWith('macarena.json')&&failures-->0)throw Object.assign(Error('test locked'),{code:'EPERM'});return rename(a,b)};");
 let proc;
 async function start(fault){proc=spawn(process.execPath,[...(fault?['--require',preload]:[]),path.join(__dirname,'server.cjs')],{env:{...process.env,PORT:'8775',HOST:'127.0.0.1',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',()=>reject(Error('Startup failed')));});}
 async function stop(){await new Promise(resolve=>{proc.once('exit',resolve);proc.kill();});proc=null;}
 let cookie;async function req(route,data){const r=await fetch('http://127.0.0.1:8775/api/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{await start(true);cookie=(await req('login',{id:initial.players[0].id,password:'1130'})).cookie;const op={id:crypto.randomUUID(),type:'score',userId:initial.players[0].id,groupId:'G1',hole:0,score:4,baseVersion:0,baseScore:null,generation:0};
 const failed=await req('sync',op);assert.equal(failed.status,503);assert(!JSON.stringify(failed).includes('EPERM'));assert.equal((await req('state')).data.cards.G1.scores[0],null);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'macarena.json'))).cards.G1.scores[0],null);
 assert.equal((await req('sync',op)).status,200);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'macarena.json'))).cards.G1.scores[0],4);await stop();await start(false);assert.equal((await req('sync',op)).status,200);assert.equal((await req('state')).data.cards.G1.revision,1);await stop();
 console.log('OK: escritura con reintentos, rollback real tras EPERM, confirmación en disco, reinicio sin duplicados, bloqueo del siguiente hoyo y recuperación de pendientes antiguos.');
 }finally{if(proc)await stop();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
