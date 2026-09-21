const crypto=require('crypto'),M=require('./model.cjs'),T=require('./tournament.cjs');
const version=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
function reset(s,b){if(b.confirm!==true||b.phrase!=='REINICIAR TORNEO')throw Error('Escriba REINICIAR TORNEO para confirmar');if(b.version!==version(s))throw Error('El torneo cambió. Revise y confirme nuevamente.');const next={players:s.players.filter(p=>p.admin).map(p=>({...p})),groups:[],members:[],assignments:[],cards:{},audit:[],receipts:{},editing:false,rainFinalization:false,captainsExplicit:true,tournament:{...T.defaults,logo:s.tournament?.logo||''},course:M.seed().course,tournamentGeneration:Math.max(Date.now(),(s.tournamentGeneration||0)+1)};M.validate(next);return next;}
module.exports={version,reset};
