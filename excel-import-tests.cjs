const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const ExcelJS=require('exceljs'),I=require('./excel-import.cjs'),M=require('./model.cjs');
function fixture(){const s=M.seed();M.validate(s);s.tournament={...require('./tournament.cjs').defaults};s.groups.push({id:'NEW',name:'Nuevo',active:true,rosterClosed:false});s.cards.NEW={scores:Array(18).fill(null),revision:0,finalized:null};require('./sync.cjs').migrate(s);return s;}
const rows=[['001234','Ana','Prueba','2daA','Clave123','SI','NEW',1,'SI'],['001235','Luis','Prueba','3ra','Clave234','SI','NEW',1,'NO']];
async function file(values=rows,change=()=>{}){const w=new ExcelJS.Workbook(),s=w.addWorksheet('Carga');s.addRow(I.HEADERS);values.forEach(r=>s.addRow(r));change(w,s);return Buffer.from(await w.xlsx.writeBuffer()).toString('base64');}
if(process.argv.includes('--server')){
 const Module=require('node:module'),load=Module._load,s=fixture();
 Module._load=function(id,...rest){if(id==='./postgres.cjs')return async()=>({state:s,sessions:[],recover:async()=>null,health:async()=>{},saveSessions:async()=>{},save:async state=>{if(fs.existsSync(path.join(process.env.DATA_DIR,'fail')))throw Object.assign(Error('Fallo simulado'),{status:503});fs.writeFileSync(path.join(process.env.DATA_DIR,'saved.json'),JSON.stringify(state));}});return load.call(this,id,...rest);};
 require('./server.cjs');
}else main().catch(e=>{console.error(e);process.exitCode=1;});
async function main(){
 const state=fixture(),original=structuredClone(state),good=await file(),parsed=await I.readFile(good),validated=I.validate(state,parsed.rows);
 assert.deepEqual(validated.summary,{players:2,members:2,groups:1});assert.deepEqual(state,original);
 const cases=[
  [r=>r[1][0]=r[0][0],'Cedula'],[r=>r[0][0]=state.players[0].id,'Cedula'],[r=>r[0][0]=1234,'Cedula'],
  [r=>r[0][1]='x'.repeat(81),'Nombre'],[r=>r[0][4]='x'.repeat(65),'Clave'],[r=>r[0][3]='4ta','Categoria'],
  [r=>r[0][6]='MISSING','CodigoGrupo'],[r=>r[1][7]=10,'HoyoSalida'],[r=>r[0][7]=1.5,'HoyoSalida'],
  [r=>r[1][8]='SI','Capitan'],[r=>r[0][8]='NO','Capitan'],[r=>r[0][5]='NO','Capitan'],
  [r=>r[0][1]={formula:'1+1',result:2},'Nombre'],[r=>r[0][4]='','Clave']
 ];
 for(const [change,column] of cases){const r=structuredClone(rows);change(r);const p=await I.readFile(await file(r));assert.throws(()=>I.validate(state,p.rows),e=>e.status===422&&e.importErrors.some(x=>x.column===column));assert.deepEqual(state,original);}
 for(const change of [s=>s.groups.at(-1).rosterClosed=true,s=>s.groups.at(-1).active=false,s=>s.cards.NEW.scores[0]=4,s=>s.cards.NEW.finalized={}]){const s=fixture();change(s);assert.throws(()=>I.validate(s,parsed.rows),e=>e.status===422);}
 for(const change of [(w,s)=>s.name='Otra',(w,s)=>w.addWorksheet('Otra'),(w,s)=>s.getCell('A1').value='Documento',(w,s)=>s.mergeCells('B4:C4'),(w,s)=>s.getCell('J2').value='extra',(w,s)=>s.getCell('A1002').value='fuera'])await assert.rejects(I.readFile(await file(rows,change)),e=>e.status===422);
 await assert.rejects(I.readFile('no es un excel'),e=>e.status===422);
 const template=fs.readFileSync(path.join(__dirname,'templates/carga.xlsx'));await assert.rejects(I.readFile(template.toString('base64')),e=>e.importErrors.some(x=>/no contiene jugadores/.test(x.message)));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'macarena-import-')),vault=require('./password-vault.cjs')(dir),next=await I.prepare(state,validated.records,vault);
 assert.equal(next.players.length,state.players.length+2);assert.equal(next.members.length,state.members.length+2);assert.equal(next.players.at(-2).id,'001234');assert(!next.players.at(-1).admin);assert(M.passwordMatches(rows[0][4],next.players.at(-2).passwordHash));assert.equal(vault.decrypt(next.players.at(-2).passwordEncrypted),rows[0][4]);assert.deepEqual(next.assignments,state.assignments);assert.deepEqual(next.groups,state.groups);assert.deepEqual(state,original);
 // Real HTTP routes, isolated in-memory persistence. No production or local PostgreSQL access.
 const net=require('node:net'),probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=require('node:child_process').spawn(process.execPath,[__filename,'--server'],{env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,PASSWORD_ENCRYPTION_KEY:''},stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Servidor de prueba no inició: '+stderr)),15000);child.stdout.on('data',b=>{if(String(b).includes('Tarjeta Macarena')){clearTimeout(timer);resolve();}});child.once('exit',()=>{clearTimeout(timer);reject(Error(stderr));});});
  async function req(route,data,cookie){const r=await fetch(`http://127.0.0.1:${port}/api/`+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const admin=(await req('login',{id:state.players[0].id,password:'1130'})).cookie,reader=(await req('login',{id:state.players[1].id,password:'Golf2026!'})).cookie;
  assert.equal((await req('import-excel-check',{file:good},reader)).status,403);assert.equal((await req('import-excel',{file:good,confirm:true},reader)).status,403);assert.equal((await req('import-template',null,reader)).status,403);assert.equal((await req('import-template',null,admin)).status,200);
  let check=await req('import-excel-check',{file:good},admin);assert.equal(check.status,200);assert.equal((await req('state',null,admin)).data.players.length,state.players.length);
  assert.equal((await req('import-excel',{file:good,confirm:true,token:'bad'},admin)).status,409);
  await req('editing',{enabled:true},admin);assert.equal((await req('import-excel',{file:good,confirm:true,token:check.data.token},admin)).status,409);
  check=await req('import-excel-check',{file:good},admin);
  fs.writeFileSync(path.join(dir,'fail'),'1');assert.equal((await req('import-excel',{file:good,confirm:true,token:check.data.token},admin)).status,503);assert.equal((await req('state',null,admin)).data.players.length,state.players.length);fs.unlinkSync(path.join(dir,'fail'));
  let result=await req('import-excel',{file:good,confirm:true,token:check.data.token},admin);assert.equal(result.status,200);assert.equal(result.data.players.length,state.players.length+2);assert(!JSON.stringify(result.data).includes('Clave123'));
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'saved.json')));assert.equal(saved.audit.at(-1).action,'excel-import');assert(!JSON.stringify(saved.audit).includes('Clave123'));
  result=await req('import-excel',{file:good,confirm:true,token:check.data.token},admin);assert.equal(result.status,422);assert.equal((await req('state',null,admin)).data.players.length,state.players.length+2);
  console.log('OK: XLSX real y plantilla, validaciones completas, permisos HTTP, confirmación, concurrencia, rechazo de repetición, contraseñas, auditoría y rollback simulado.');
 }finally{child.kill();}
}
