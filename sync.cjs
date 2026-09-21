const crypto=require('node:crypto'),M=require('./model.cjs'),Scoring=require('./public/scoring.js');
function migrate(s){s.receipts??={};s.rainFinalization??=false;for(const c of Object.values(s.cards)){c.holeVersions??=Array(18).fill(0);c.generation??=0;}}
function fail(message,status){const e=Error(message);e.status=status;throw e;}
function apply(s,user,op){
 migrate(s);
 if(!op||!/^[-a-zA-Z0-9]{12,80}$/.test(op.id)||op.userId!==user.id)fail('Operación o usuario inválido',400);
 const key=user.id+':'+op.id,digest=crypto.createHash('sha256').update(JSON.stringify(op)).digest('hex');
 if(s.receipts[key]){if(s.receipts[key]!==digest)fail('Identificador de operación reutilizado',409);return {duplicate:true};}
 const c=s.cards[op.groupId];if(!c||!M.canEdit(s,user,op.groupId))fail('Edición bloqueada o anotador cambiado. El borrador sigue guardado en el celular.',403);
 if(c.generation!==op.generation)fail('La tarjeta se reabrió desde otro dispositivo. Revise el borrador antes de enviarlo.',409);
 if(op.type==='score'){
 if(!Number.isInteger(op.hole)||op.hole<0||op.hole>17||op.score!==null&&(!Number.isInteger(op.score)||op.score<1||op.score>19))fail('Registre entre 1 y 19 golpes',400);
 if(c.holeVersions[op.hole]!==op.baseVersion||c.scores[op.hole]!==op.baseScore)fail(`El hoyo ${op.hole+1} cambió en otro dispositivo. No se sobrescribió.`,409);
 Scoring.validateSequence(c.scores,M.startOf(s,op.groupId),op.hole,op.score);
 c.scores[op.hole]=op.score;c.holeVersions[op.hole]++;c.revision++;
 }else if(op.type==='finalize'){
 if(!user.admin&&!s.rainFinalization&&c.scores.some(v=>v===null))fail('Faltan hoyos por registrar',400);
 if(JSON.stringify(c.scores)!==JSON.stringify(op.scores)||JSON.stringify(c.holeVersions)!==JSON.stringify(op.holeVersions))fail('Los golpes cambiaron después de firmar. Revise y vuelva a firmar.',409);
 if(!Array.isArray(op.signatures)||op.signatures.length!==2||op.signatures.some(s=>!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)||s.length<1500||s.length>500000))fail('Se requieren ambas firmas',400);
 const captain=s.members.find(m=>m.groupId===op.groupId&&m.captain&&s.players.some(p=>p.id===m.playerId&&p.active)),writer=s.assignments.find(a=>a.groupId===op.groupId);
 if(!captain||!writer||captain.playerId!==op.captain||writer.playerId!==op.writer)fail('Los capitanes cambiaron. Se requieren firmas nuevas.',409);
 c.finalized={at:new Date().toISOString(),by:user.id,captain:op.captain,writer:op.writer,signatures:op.signatures,administrative:!!user.admin&&c.scores.some(v=>v===null),rain:!user.admin&&c.scores.some(v=>v===null),scores:[...c.scores]};c.revision++;
 }else fail('Operación desconocida',400);
 s.receipts[key]=digest;return {duplicate:false};
}
module.exports={migrate,apply};
