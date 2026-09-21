const M=require('./model.cjs');
function apply(s,b){const g=s.groups.find(g=>g.id===b.groupId);if(!g)throw Error('Grupo no encontrado');const members=s.members.filter(m=>m.groupId===g.id);if(JSON.stringify(members)!==JSON.stringify(b.baseMembers)||!!g.rosterClosed!==b.baseClosed)throw Error('El grupo cambió. Abra el formulario nuevamente.');
if(b.action==='open'){g.rosterClosed=false;return;}
if(g.rosterClosed)throw Error('El grupo está cerrado. Ábralo antes de modificar integrantes.');
if(b.action==='close'){if(!members.some(m=>m.captain&&s.players.some(p=>p.id===m.playerId&&p.active)))throw Error('Seleccione un capitán activo antes de cerrar el grupo');g.rosterClosed=true;return;}
if(b.action!=='save')throw Error('Acción no válida');
if(!Array.isArray(b.playerIds)||!b.playerIds.length||new Set(b.playerIds).size!==b.playerIds.length)throw Error('Seleccione uno o varios integrantes sin duplicados');
if(!Number.isInteger(b.start)||b.start<1||b.start>18)throw Error('Seleccione un hoyo del 1 al 18');
for(const id of b.playerIds){if(!s.players.some(p=>p.id===id))throw Error('Jugador no encontrado');const other=s.members.find(m=>m.playerId===id&&m.groupId!==g.id);if(other)throw Error('El integrante ya pertenece a '+(s.groups.find(g=>g.id===other.groupId)?.name||other.groupId));}
if(b.captainId&&(!b.playerIds.includes(b.captainId)||!s.players.some(p=>p.id===b.captainId&&p.active)))throw Error('El capitán debe ser uno de los integrantes activos seleccionados');if(b.close&&!b.captainId)throw Error('Seleccione un capitán antes de cerrar el grupo');const next=b.playerIds.map(playerId=>({groupId:g.id,playerId,start:b.start,captain:playerId===b.captainId}));const unchanged=members.length===next.length&&members.every(m=>next.some(n=>n.playerId===m.playerId&&n.start===m.start&&!!n.captain===!!m.captain));
if(!unchanged&&(s.cards[g.id]?.finalized||s.cards[g.id]?.scores.some(v=>v!==null)))throw Error('No cambie integrantes o salida después de registrar golpes o finalizar la tarjeta');
s.members=s.members.filter(m=>m.groupId!==g.id).concat(next);M.validate(s);if(b.close===true)g.rosterClosed=true;
}
module.exports={apply};
