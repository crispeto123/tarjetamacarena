const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'macarena-sync-'));let proc;
async function start(){proc=spawn(process.execPath,['server.cjs'],{cwd:__dirname,env:{...process.env,PORT:'8771',DATA_DIR:dir},stdio:['ignore','pipe','inherit']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve();});proc.once('error',reject);});}
async function stop(){await new Promise(resolve=>{proc.once('exit',resolve);proc.kill();});proc=null;}
async function req(route,data,cookie){const r=await fetch('http://127.0.0.1:8771/api/'+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
async function main(){await start();const admin=(await req('login',{id:'1036926786',password:'1130'})).cookie;await req('editing',{enabled:true},admin);const cap=(await req('login',{id:'9000000004',password:'Golf2026!'})).cookie;
 const op={id:crypto.randomUUID(),type:'score',userId:'9000000004',groupId:'G1',generation:0,createdAt:new Date().toISOString(),hole:0,score:3,baseScore:null,baseVersion:0};
 const controller=new AbortController(),stream=await fetch('http://127.0.0.1:8771/api/events',{headers:{Cookie:cap},signal:controller.signal}),reader=stream.body.getReader();assert.equal(stream.status,200);assert((new TextDecoder().decode((await reader.read()).value)).includes('event: changed'));
 assert.equal((await req('sync',op,cap)).status,200);assert((new TextDecoder().decode((await reader.read()).value)).includes('event: changed'));controller.abort();
 await stop();await start();let s=await req('state',null,cap);assert.equal(s.status,200,'Session survives restart');assert.equal(s.data.cards.G1.scores[0],3);assert(!('receipts' in s.data));assert(s.data.offlineUntil>Date.now());
 assert.equal((await req('sync',op,cap)).status,200);s=await req('state',null,cap);assert.equal(s.data.cards.G1.revision,1,'Lost acknowledgment is not applied twice');
 assert.equal((await req('sync',{...op,score:4},cap)).status,409);
 assert.equal((await req('sync',{...op,id:crypto.randomUUID(),hole:1,score:3},cap)).status,200,'Independent hole can merge');
 assert.equal((await req('sync',{...op,id:crypto.randomUUID(),score:4},cap)).status,409);
 await req('editing',{enabled:false},admin);assert.equal((await req('sync',{...op,id:crypto.randomUUID(),hole:2},cap)).status,403);
 for(const file of ['/','/offline.js','/sw.js','/manifest.webmanifest','/tournament-logo.jpg'])assert.equal((await fetch('http://127.0.0.1:8771'+file)).status,200);
 await req('logout',{},cap);assert.equal((await req('state',null,cap)).status,401);
 console.log('OK HTTP móvil: eventos en vivo, sesión persistente, reenvío tras reinicio, conflictos por hoyo, permisos y recursos offline/logo.');await stop();
}
main().catch(e=>{console.error(e);process.exitCode=1;proc?.kill();});
