const assert=require('node:assert/strict'),M=require('./model.cjs'),Sync=require('./sync.cjs'),{Engine,view}=require('./public/offline.js');
class MemoryStore{constructor(){this.values=new Map();this.chain=Promise.resolve();}async read(id){return structuredClone(this.values.get(id)||{snapshot:null,pending:[]});}change(id,fn){const task=this.chain.then(async()=>{const value=fn(await this.read(id));this.values.set(id,structuredClone(value));return structuredClone(value);});this.chain=task.catch(()=>{});return task;}}
async function main(){let s=M.seed();M.validate(s);Sync.migrate(s);s.editing=true;const user=s.players[4],store=new MemoryStore();let online=true,loseAck=false;
 const snapshot=()=>{const {receipts,...rest}=structuredClone(s);return {...rest,me:user.id,offlineUntil:Date.now()+86400000,permissions:Object.fromEntries(s.groups.map(g=>[g.id,M.canEdit(s,user,g.id)]))};};
 const transport=async(path,op)=>{if(!online)throw Error('Sin señal');if(path==='sync'){Sync.apply(s,user,op);if(loseAck){loseAck=false;throw Error('Se perdió la respuesta');}}return snapshot();};
 let engine=new Engine({store,transport});engine.user=user.id;await engine.accept(snapshot());online=false;
 await engine.queue('score',{groupId:'G1',hole:0,score:3});await engine.queue('score',{groupId:'G1',hole:0,score:4});await engine.queue('score',{groupId:'G1',hole:1,score:2});await engine.sync();assert.equal(engine.record.pending.length,3);assert.equal(view(engine.record).cards.G1.scores[0],4);assert.equal(s.cards.G1.scores[0],null);
 engine=new Engine({store,transport});await engine.restore(user.id);assert.equal(view(engine.record).cards.G1.scores[1],2);online=true;loseAck=true;await engine.sync();assert.equal(engine.record.pending.length,3);assert.equal(s.cards.G1.scores[0],3);
 // Restart the server state too: receipts are durable, so a lost reply is safe.
 s=JSON.parse(JSON.stringify(s));await engine.sync();assert.equal(engine.record.pending.length,0);assert.equal(s.cards.G1.revision,3);assert.equal(s.cards.G1.scores[0],4);
 online=false;await engine.queue('score',{groupId:'G1',hole:1,score:3});s.cards.G1.scores[1]=4;s.cards.G1.holeVersions[1]++;online=true;await engine.sync();assert.equal(engine.record.pending[0].status,409);assert.equal(s.cards.G1.scores[1],4);assert.equal(view(engine.record).cards.G1.scores[1],3);
 await engine.discardGroup('G1');assert.equal(view(engine.record).cards.G1.scores[1],4);
 online=false;await engine.queue('score',{groupId:'G1',hole:2,score:4});s.editing=false;online=true;await engine.sync();assert.equal(engine.record.pending[0].status,403);assert.equal(s.cards.G1.scores[2],null);s.editing=true;await engine.retry();assert.equal(s.cards.G1.scores[2],4);assert.equal(engine.record.pending.length,0);
 for(let hole=0;hole<18;hole++)if(view(engine.record).cards.G1.scores[hole]===null)await engine.queue('score',{groupId:'G1',hole,score:s.course.pars[hole]});
 const signature='data:image/jpeg;base64,'+require('node:fs').readFileSync(__dirname+'/test-signature.jpg').toString('base64');
 await engine.queue('finalize',{groupId:'G1',captain:s.players[0].id,writer:user.id,signatures:[signature,signature]});assert(view(engine.record).cards.G1.finalized.pending);online=false;await engine.sync();engine=new Engine({store,transport});await engine.restore(user.id);assert(view(engine.record).cards.G1.finalized.pending);online=true;await engine.sync();assert(s.cards.G1.finalized);assert.equal(engine.record.pending.length,0);
 const other=await store.read(s.players[8].id);assert.equal(other.pending.length,0);assert.equal(other.snapshot,null);
 // A 401 never drops drafts or switches their author.
 await engine.discardGroup('G1');s.cards.G1.finalized=null;s.cards.G1.generation++;await engine.accept(snapshot());await engine.queue('score',{groupId:'G1',hole:0,score:2});engine.transport=async()=>{const e=Error('Sesión vencida');e.status=401;throw e;};await engine.sync();assert(engine.auth);assert.equal(engine.record.pending.length,1);
 console.log('OK offline: cierre/reapertura, múltiples golpes, respuesta perdida, reintento idempotente, conflictos, permisos, firmas y aislamiento por usuario.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
