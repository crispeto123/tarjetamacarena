const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),M=require('./model.cjs'),Sync=require('./sync.cjs'),Scoring=require('./public/scoring.js'),{Engine,view}=require('./public/offline.js');
class Store{async read(){return structuredClone(this.r);}async change(id,fn){this.r=fn(this.r);return structuredClone(this.r);}}
async function main(){
 for(const start of [1,8,18]){const scores=Array(18).fill(null);for(let i=0;i<18;i++){const h=(start-1+i)%18;assert.equal(Scoring.nextHole(scores,start),h);assert(Scoring.canRecord(scores,start,h));if(i<17)assert.throws(()=>Scoring.validateSequence(scores,start,(h+1)%18,4),/Primero/);Scoring.validateSequence(scores,start,h,4);scores[h]=4;}assert.equal(Scoring.nextHole(scores,start),-1);Scoring.validateSequence(scores,start,start-1,3);assert.throws(()=>Scoring.validateSequence(scores,start,start-1,null),/posteriores/);Scoring.validateSequence(scores,start,(start+16)%18,null);}
 const s=M.seed();Sync.migrate(s);s.editing=true;s.members.filter(m=>['G1','G2'].includes(m.groupId)).forEach(m=>m.start=8);const user=s.players[4];
 const snapshot=()=>({...structuredClone(s),me:user.id,offlineUntil:Date.now()+86400000,permissions:Object.fromEntries(s.groups.map(g=>[g.id,M.canEdit(s,user,g.id)]))});
 const store=new Store();store.r={snapshot:snapshot(),pending:[]};const engine=new Engine({store,transport:async(route,op)=>{if(route==='sync')Sync.apply(s,user,op);return snapshot();}});await engine.restore(user.id);
 await assert.rejects(engine.queue('score',{groupId:'G1',hole:8,score:4}),/Primero registre el hoyo 8/);
 for(let i=0;i<18;i++)await engine.queue('score',{groupId:'G1',hole:(7+i)%18,score:4});assert.equal(store.r.pending.length,18);assert.equal(view(engine.record).cards.G1.scores.filter(v=>v!==null).length,18);
 const restored=new Engine({store,transport:engine.transport});await restored.restore(user.id);await restored.sync();assert.equal(restored.record.pending.length,0);assert(s.cards.G1.scores.every(v=>v===4));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'macarena-order-'));const fresh=M.seed();fresh.editing=true;fresh.members.filter(m=>['G1','G2'].includes(m.groupId)).forEach(m=>m.start=8);fs.writeFileSync(path.join(temp,'macarena.json'),JSON.stringify(fresh));
 const proc=spawn(process.execPath,['server.cjs'],{cwd:__dirname,env:{...process.env,HOST:'127.0.0.1',PORT:'8774',DATA_DIR:temp},stdio:['ignore','pipe','inherit']});
 try{await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',()=>reject(Error('Servidor terminó')));});let cookie;
 const request=async(route,data)=>{const r=await fetch('http://127.0.0.1:8774/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};};
 cookie=(await request('login',{id:fresh.players[0].id,password:'1130'})).cookie;
 assert.equal((await request('score',{groupId:'G1',hole:8,score:4,revision:0})).status,400);
 assert.equal((await request('score',{groupId:'G1',hole:7,score:4,revision:0})).status,200);
 const bad={id:crypto.randomUUID(),userId:fresh.players[0].id,type:'score',groupId:'G1',generation:0,hole:9,score:4,baseVersion:0,baseScore:null};assert.equal((await request('sync',bad)).status,400);
 assert.equal((await request('score',{groupId:'G1',hole:8,score:4,revision:1})).status,200);
 assert.equal((await request('score',{groupId:'G1',hole:7,score:null,revision:2})).status,400);
 assert.equal((await request('score',{groupId:'G1',hole:7,score:3,revision:2})).status,200);
 console.log('OK: salida 1/8/18, vuelta circular, correcciones, borrado protegido, 18 registros offline y reapertura, API y sincronización sin excepción admin.');
 }finally{proc.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
