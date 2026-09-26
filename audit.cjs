const labels={download:'Descarga', 'clear-history':'Reiniciar Historial','reset-tournament':'Reiniciar Torneo',roster:'Grupo–Jugador',players:'Jugadores',groups:'Grupos',members:'Grupo–Jugador',rosters:'Grupo–Jugador',assignments:'Asignación de tarjetas',course:'Cancha',tournament:'Torneo',score:'Golpes','rain-finalization':'Finalizado por lluvia',editing:'Control de edición',finalize:'Finalización',reopen:'Reapertura','reset-card':'Reiniciar tarjeta','reset-cards':'Reiniciar todas las tarjetas'};
const player=(s,id)=>{const p=s.players.find(p=>p.id===id);return p?`${p.name} ${p.surname}`:id||'Sin asignar';};
const group=(s,id)=>s.groups.find(g=>g.id===id)?.name||id||'grupo';
function functionalityOf(a,operation){if(a.action==='score'){if(operation==='Insert'||a.previous===null)return 'Tarjeta Digitar Hoyo';if(operation==='Update'||operation==='Delete'||Object.hasOwn(a,'previous'))return 'Tarjeta Editar Hoyo';return 'Tarjeta Hoyo (registro anterior)';}if(a.action==='master')return {players:'Maestros Jugadores',groups:'Maestros Grupos',members:'Maestros Grupo Jugador',rosters:'Maestros Grupo Jugador',assignments:'Maestro Asignación Tarjetas',tournament:'Configuración Torneo',course:'Configuración Cancha'}[a.type]||'Maestros';return {finalize:'Tarjeta Finalizar','reset-card':'Tarjeta Reiniciar Tarjeta',download:'Tarjeta Descargar',reopen:'Tarjeta Reabrir',roster:'Maestros Grupo Jugador','reset-cards':'Configuración Reiniciar Tarjetas','clear-history':'Configuración Historial Reiniciar Historial','reset-tournament':'Configuración Reiniciar Torneo',editing:'Configuración Habilitar Edición','rain-finalization':'Configuración Finalizado por lluvia'}[a.action]||a.area||a.action;}
function entry(before,after,action,d){
 let functionality='Update',description='';const area=labels[action==='master'?d.type:action]||action;
 if(action==='score'){const old=before.cards[d.groupId]?.scores[d.hole-1];functionality=d.score===null?'Delete':old===null?'Insert':'Update';description=`${group(after,d.groupId)}, hoyo ${d.hole}: ${old??'sin jugar'} → ${d.score??'sin jugar'} golpes.`;}
 else if(action==='rain-finalization')description=d.enabled?'Habilitó el finalizado anticipado por lluvia.':'Deshabilitó el finalizado anticipado por lluvia.';
 else if(action==='roster')description=(d.rosterAction==='open'?'Abrió integrantes de ':d.rosterAction==='close'?'Cerró integrantes de ':'Actualizó integrantes y hoyo de ')+group(after,d.groupId)+(d.rosterAction==='save'&&d.closed?' y cerró el grupo.':'.');
 else if(action==='reset-tournament'){functionality='Delete';description='Reinició el torneo y su configuración; eliminó tarjetas, asignaciones, grupos, integrantes y jugadores no administradores.';}
 else if(action==='download')description='Solicitó la descarga de '+group(after,d.groupId)+' en '+(d.format||'PDF')+'.';
 else if(action==='clear-history'){functionality='Delete';description='Reinició el historial de la aplicación.';}
 else if(action==='editing')description=d.enabled?'Habilitó la edición de tarjetas para los anotadores.':'Deshabilitó la edición de tarjetas para los anotadores.';
 else if(action==='finalize')description=`Finalizó ${group(after,d.groupId)} con ${after.cards[d.groupId].scores.filter(v=>v!==null).length}/18 hoyos y las dos firmas${after.cards[d.groupId].finalized?.rain?' (cierre por lluvia)':d.administrative?' (cierre administrativo)':''}.`;
 else if(action==='reopen')description=`Reabrió ${group(after,d.groupId)}; se requieren firmas nuevas.`;
 else if(action==='reset-card'||action==='reset-cards'){functionality='Delete';description=action==='reset-card'?`Borró los golpes, firmas y cierre de ${group(after,d.groupId)}.`:`Borró los golpes, firmas y cierres de ${d.count} tarjetas.`;}
 else if(action==='master'&&d.type==='rosters'){functionality='Delete';description=`Eliminó todos los vínculos Grupo–Jugador de ${group(before,d.id)} (${before.members.filter(m=>m.groupId===d.id).length} integrantes). Conservó el grupo y los jugadores.`;}
 else if(action==='master'){
  const key=d.type==='members'?'playerId':d.type==='assignments'?'groupId':'id',id=d[key]||d.id;
  const find=s=>Array.isArray(s[d.type])?s[d.type].find(r=>r[key]===id):s[d.type];const old=find(before),now=find(after);
  functionality=!now?'Delete':!old?'Insert':'Update';
  const target=d.type==='players'?player(now?after:before,id):d.type==='groups'?group(now?after:before,id):d.type==='members'?`${player(now?after:before,id)} en ${group(now?after:before,(now||old)?.groupId)}`:d.type==='assignments'?`${group(after,id)} · Anotador: ${player(now?after:before,(now||old)?.playerId)}`:(now||old)?.name||(now||old)?.title||area;
  description=`${functionality==='Insert'?'Creó':functionality==='Delete'?'Eliminó':'Actualizó'} ${area}: ${target}.`;
  if(old&&now){const fields={name:'Nombre',surname:'Apellido',category:'Categoría',active:'Activo',admin:'Administrador',start:'Hoyo de salida',groupId:'Grupo',playerId:'Anotador',title:'Título',subtitle:'Descripción',date:'Fecha'};for(const [key,label] of Object.entries(fields))if(JSON.stringify(old[key])!==JSON.stringify(now[key]))description+=` ${label}: ${old[key]??'sin definir'} → ${now[key]??'sin definir'}.`;if(old.passwordHash!==now.passwordHash)description+=' Cambió la clave.';if(JSON.stringify(old.pars)!==JSON.stringify(now.pars))description+=' Actualizó los pares de la cancha.';if(old.logo!==now.logo)description+=' Cambió el logo.';}
 }
 return {area,operation:functionality,functionality:functionalityOf({action,...d},functionality),description:description||area};
}
function present(a,s){if(a.description)return {...a,functionality:functionalityOf(a,a.operation||a.functionality)};const area=labels[a.action==='master'?a.type:a.action]||a.action;let functionality='No registrado',description=`Registro anterior de ${area}${a.groupId?' · '+group(s,a.groupId):a.id?' · '+a.id:''}.`;
 if(a.action==='score'){functionality=a.score===null?'Delete':Object.hasOwn(a,'previous')?(a.previous===null?'Insert':'Update'):'No registrado';description=`${group(s,a.groupId)}, hoyo ${a.hole}: ${a.score??'sin jugar'} golpes.`;}
 if(['editing','finalize','reopen'].includes(a.action))functionality='Update';if(a.action.startsWith('reset-'))functionality='Delete';
 return {...a,area,functionality:functionalityOf(a,functionality),description};}
module.exports={entry,present};
