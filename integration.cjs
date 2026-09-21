const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'macarena-test-'));const proc=spawn(process.execPath,['server.cjs'],{cwd:__dirname,env:{...process.env,PORT:'8770',DATA_DIR:dir},stdio:['ignore','pipe','inherit']});
async function request(route,data,cookie){const r=await fetch('http://127.0.0.1:8770/api/'+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:r.headers.get('content-type').includes('application/pdf')?Buffer.from(await r.arrayBuffer()):await r.json()};}
async function main(){await new Promise(resolve=>proc.stdout.once('data',resolve));
 assert.equal((await request('state')).status,401);
 const admin=(await request('login',{id:'1036926786',password:'1130'})).cookie,cap=(await request('login',{id:'9000000004',password:'Golf2026!'})).cookie,reader=(await request('login',{id:'9000000001',password:'Golf2026!'})).cookie;
 let s=(await request('state',null,admin)).data;assert(!JSON.stringify(s).includes('passwordHash'));assert.equal(s.players.length,16);
 const score=(groupId,hole,score,revision,cookie)=>request('score',{groupId,hole,score,revision},cookie);
 assert.equal((await score('G1',0,4,0,cap)).status,403);
 assert.equal((await request('editing',{enabled:true},reader)).status,403);
 assert.equal((await request('editing',{enabled:true},admin)).status,200);
 assert.equal((await score('G1',0,4,0,reader)).status,403);assert.equal((await score('G3',0,4,0,cap)).status,403);
 assert.equal((await score('G1',0,3,0,cap)).status,200);assert.equal((await score('G1',0,5,0,cap)).status,409);
 let rev=1;for(let h=1;h<18;h++){const r=await score('G1',h,s.course.pars[h],rev++,cap);assert.equal(r.status,200);}
 assert.equal((await request('finalize',{groupId:'G1',revision:18,signatures:[]},cap)).status,400);
 const signature='data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'test-signature.jpg')).toString('base64');
 const final=await request('finalize',{groupId:'G1',revision:18,signatures:[signature,signature]},cap);assert.equal(final.status,200);
 assert.equal((await score('G1',0,4,19,admin)).status,403);
 const pdf=await request('card.pdf?group=G1',null,reader);assert.equal(pdf.status,200);assert.equal(pdf.data.subarray(0,4).toString(),'%PDF');fs.writeFileSync(path.join(__dirname,'test-card.pdf'),pdf.data);
 assert.equal((await request('reopen',{groupId:'G1'},cap)).status,403);assert.equal((await request('reopen',{groupId:'G1'},admin)).status,200);
 await request('editing',{enabled:false},admin);assert.equal((await score('G1',0,4,20,cap)).status,403);assert.equal((await score('G1',0,4,20,admin)).status,200);
 for(const bad of [0,20,43,1.5])assert.equal((await score('G2',0,bad,0,admin)).status,400);
 assert.equal((await score('G2',0,19,0,admin)).status,200);
 await request('editing',{enabled:true},admin);
 assert.equal((await request('finalize',{groupId:'G1',revision:21,signatures:[signature,signature]},reader)).status,403);
 assert.equal((await request('finalize',{groupId:'G2',revision:1,signatures:[signature,signature]},admin)).status,200);
 const latest=(await request('state',null,admin)).data;assert(latest.cards.G2.finalized.administrative);assert.equal(latest.cards.G2.scores.filter(v=>v===null).length,17);
 const config={type:'tournament',record:{title:'Torneo anual Amigos del Golf',subtitle:'Scramble a 18 hoyos Club La Macarena',date:'2026-10-04'}};
 assert.equal((await request('master',config,reader)).status,403);assert.equal((await request('master',config,admin)).status,200);
 const changed=(await request('state',null,admin)).data;assert.equal(changed.tournament.date,'2026-10-04');assert.deepEqual(changed.cards,latest.cards);
 console.log('OK HTTP: autenticación, permisos, scores 1–19, revisión concurrente, firmas, cierre administrativo, PDF, reapertura y configuración del torneo. Datos temporales:',dir);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>proc.kill());
