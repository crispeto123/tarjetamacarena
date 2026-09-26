const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('./model.cjs'),D=require('./master-delete.cjs'),A=require('./audit.cjs');
function fixture(){const s=M.seed();M.validate(s);s.assignments=[];return s;}
function rejected(change,pattern){const s=fixture(),admin=s.players[0],version=D.inspect(s,admin,'rosters','G1').version;change(s);const before=structuredClone(s);assert.throws(()=>D.remove(s,admin,'rosters','G1',version),pattern);assert.deepEqual(s,before);}
const s=fixture(),admin=s.players[0],before=structuredClone(s),check=D.inspect(s,admin,'rosters','G1');
assert(check.allowed);D.remove(s,admin,'rosters','G1',check.version);M.validate(s);
assert.equal(s.members.filter(m=>m.groupId==='G1').length,0);
assert.deepEqual(s.members,before.members.filter(m=>m.groupId!=='G1'));
for(const k of ['players','groups','cards','assignments'])assert.deepEqual(s[k],before[k]);
const entry=A.entry(before,s,'master',{type:'rosters',id:'G1'});
assert.equal(entry.operation,'Delete');assert.equal(entry.functionality,'Maestros Grupo Jugador');assert.match(entry.description,/4 integrantes/);
assert.throws(()=>D.inspect(s,admin,'rosters','G1'),/no tiene integrantes/);
assert.throws(()=>D.inspect(before,before.players[1],'rosters','G1'),/administradores/);
assert.throws(()=>D.remove(before,before.players[1],'rosters','G1',check.version),/administradores/);
rejected(s=>s.groups[0].rosterClosed=true,/cerrado/);
rejected(s=>s.cards.G1.scores[0]=4,/Tarjetas/);
rejected(s=>s.cards.G1.finalized={by:s.players[0].id},/Tarjetas/);
rejected(s=>s.assignments.push({groupId:'G1',playerId:s.players[4].id}),/Asignación/);
rejected(s=>s.assignments.push({groupId:'G2',playerId:s.players[0].id}),/Asignación/);
rejected(s=>s.members[0].start=2,/cambió/);
rejected(s=>s.members.splice(1,1),/cambió/);
rejected(s=>s.members[1].captain=true,/cambió/);
// Render the actual master view with fixtures, without connecting to a database.
const src=fs.readFileSync(__dirname+'/public/app.js','utf8'),view=fixture();
const ctx={S:view,master:'members',rosterQuery:'',player:id=>view.players.find(p=>p.id===id),name:id=>id,normalizeSearch:x=>String(x).toLowerCase(),eye:'Ver'};
vm.createContext(ctx);
vm.runInContext(src.split('\n')[0]+'\n'+src.split('\n').find(l=>l.startsWith('const button='))+'\n'+src.slice(src.indexOf('const trashIcon='),src.indexOf('function remoteActionConflict(')).split('function refreshVisible')[0]+'\n'+src.split('\n').find(l=>l.startsWith('function rosterControls()')),ctx);
const html=ctx.masters();assert(!html.includes('<table>'));assert.equal((html.match(/data-action="roster-delete"/g)||[]).length,view.groups.length);
assert(html.includes('data-action="roster-delete" data-id="G1"'));assert(!html.includes('data-action="delete-master"'));
console.log('OK: eliminación completa y atómica de integrantes, permisos, dependencias, concurrencia, auditoría y botón exterior por grupo.');
