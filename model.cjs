const crypto = require('node:crypto');
const pars = [4,3,4,5,4,3,4,5,4,4,3,5,3,4,5,5,3,4];
const categories = ['1ra','2daA','2daB','3ra'];
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) { return salt + ':' + crypto.scryptSync(password,salt,64).toString('hex'); }
function passwordMatches(password, hash) { if(!hash) return false; const candidate=passwordHash(password,hash.split(':')[0]); return crypto.timingSafeEqual(Buffer.from(candidate),Buffer.from(hash)); }
function seed() {
 const names=[['Julian','Ocampo','Capi'],['Mauro','Rios','Mauro'],['William','Velez','Willy'],['London','Garcia','London'],['Andres','Mejia','Andy'],['Carlos','Ruiz','Charlie'],['Felipe','Lopez','Pipe'],['Santiago','Diaz','Santi'],['Juan','Restrepo','Juancho'],['Daniel','Torres','Dani'],['Camilo','Perez','Cami'],['David','Castro','David'],['Pablo','Moreno','Pablo'],['Mateo','Gil','Mate'],['Nicolas','Soto','Nico'],['Jorge','Leon','Jorge']];
 const players=names.map((n,i)=>({id:i===0?'1036926786':String(9000000000+i),name:n[0],surname:n[1],category:categories[i%4],active:true,admin:i===0,passwordHash:passwordHash(i===0?'1130':'Golf2026!')}));
 const groups=Array.from({length:4},(_,i)=>({id:'G'+(i+1),name:'Grupo '+(i+1),active:true}));
 return {course:{name:'Macarena',pars},players,groups,members:players.map((p,i)=>({playerId:p.id,groupId:groups[Math.floor(i/4)].id,start: i<8?1:10})),assignments:groups.map((g,i)=>({groupId:g.id,playerId:players[[4,0,12,8][i]].id})),editing:false,cards:Object.fromEntries(groups.map(g=>[g.id,{scores:Array(18).fill(null),revision:0,finalized:null}])),audit:[]};
}
function startOf(s,g) { return s.members.find(m=>m.groupId===g)?.start; }
function order(start) { return Array.from({length:18},(_,i)=>(start-1+i)%18); }
function total(s,card) { let strokes=0,par=0,played=0; card.scores.forEach((v,i)=>{if(v!==null){strokes+=v;par+=s.course.pars[i];played++;}});return {strokes,par,played,relative:strokes-par}; }
function canEdit(s,u,g) { if(!u?.active||!s.groups.find(x=>x.id===g)?.active||s.cards[g]?.finalized)return false;if(u.admin)return true;return s.editing&&s.members.some(m=>m.playerId===u.id&&m.captain)&&s.assignments.some(a=>a.groupId===g&&a.playerId===u.id)&&s.members.some(m=>m.playerId===u.id&&m.start===startOf(s,g)); }
function migrateCaptains(s){if(s.captainsExplicit)return;for(const g of s.groups){const captain=s.members.find(m=>m.groupId===g.id&&s.players.some(p=>p.id===m.playerId&&p.active&&p.category==='1ra'));for(const m of s.members.filter(m=>m.groupId===g.id))m.captain=m===captain;}s.captainsExplicit=true;}
function validate(s) { migrateCaptains(s);
 const fail=m=>{throw Error(m)}; const unique=(list,label)=>{if(new Set(list).size!==list.length)fail(label+' duplicado');};
 if(!s.course.name?.trim()||s.course.pars.length!==18||s.course.pars.some(p=>!Number.isInteger(p)||p<3||p>6))fail('Configure nombre y par (3 a 6) de los 18 hoyos');
 unique(s.players.map(p=>p.id),'Cédula');unique(s.groups.map(g=>g.id),'Grupo');unique(s.members.map(m=>m.playerId),'Jugador asignado');unique(s.assignments.map(a=>a.groupId),'Tarjeta asignada');
 for(const p of s.players)if(!/^\d+$/.test(p.id)||![p.name,p.surname,p.passwordHash].every(x=>typeof x==='string'&&x.trim())||!categories.includes(p.category)||typeof p.active!=='boolean'||typeof p.admin!=='boolean')fail('Todos los campos del jugador son obligatorios');
 if(!s.players.some(p=>p.active&&p.admin))fail('Debe conservar un administrador activo');
 for(const g of s.groups)if(!/^[a-zA-Z0-9_-]+$/.test(g.id)||!g.name?.trim()||typeof g.active!=='boolean')fail('Complete código, nombre y activo del grupo');
 for(const m of s.members)if(!s.players.some(p=>p.id===m.playerId)||!s.groups.some(g=>g.id===m.groupId)||!Number.isInteger(m.start)||m.start<1||m.start>18)fail('Asignación de jugador o salida inválida');
 for(const g of s.groups){const members=s.members.filter(m=>m.groupId===g.id);if(new Set(members.map(m=>m.start)).size>1)fail('Todos los integrantes del grupo deben compartir salida');if(members.filter(m=>m.captain).length>1)fail('Solo puede haber un capitán por grupo');if(members.some(m=>m.captain&&!s.players.some(p=>p.id===m.playerId&&p.active)))fail('El capitán debe ser un integrante activo');}
 for(const a of s.assignments){const p=s.players.find(p=>p.id===a.playerId);const membership=s.members.find(m=>m.playerId===a.playerId);if(!p?.active||!membership?.captain||!membership||membership.start!==startOf(s,a.groupId))fail('El anotador debe ser capitán activo de la misma salida');if(membership.groupId===a.groupId)fail('Asigne el capitán de otro grupo de la misma salida');}
}
module.exports={seed,passwordHash,passwordMatches,startOf,order,total,canEdit,validate,categories};
