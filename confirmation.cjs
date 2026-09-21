const crypto=require('node:crypto');
function confirmed(s,user,op){
 if(!op||op.userId!==user.id||!/^[-a-zA-Z0-9]{12,80}$/.test(op.id))return false;
 const receipt=s.receipts[user.id+':'+op.id];
 if(receipt)return receipt===crypto.createHash('sha256').update(JSON.stringify(op)).digest('hex');
 // An identical score already persisted in this card generation needs no write.
 // Never reconcile signatures, another generation, or a different result this way.
 const c=s.cards[op.groupId];
 return op.type==='score'&&!!c&&c.generation===op.generation&&Number.isInteger(op.hole)&&op.hole>=0&&op.hole<18&&Number.isInteger(op.score)&&op.score>=1&&op.score<=19&&c.scores[op.hole]===op.score&&Number.isInteger(op.baseVersion)&&op.baseVersion>=0&&c.holeVersions[op.hole]>=op.baseVersion;
}
module.exports={confirmed};
