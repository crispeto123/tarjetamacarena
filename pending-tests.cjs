const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),M=require('./model.cjs'),Sync=require('./sync.cjs'),Scoring=require('./public/scoring.js'),T=require('./tournament.cjs'),{Engine,view}=require('./public/offline.js');
class Store{async read(){return structuredClone(this.r);}async change(id,fn){this.r=fn(this.r);return structuredClone(this.r);}}
async function main(){
 for(const n of [1,9,10,15,19])assert.equal(Scoring.parse(String(n)),n);
 for(const n of ['0','20','43','-1','1.5','1e1','1x',' 4','123'])assert.throws(()=>Scoring.parse(n),/1 y 19/);
 assert.equal(Scoring.parse(''),null);assert.equal(Scoring.result(1,4)[0],'ace');assert.equal(Scoring.result(2,5)[0],'albatross');
 assert.deepEqual(Scoring.palette.map(x=>x[1]),['Sin jugar','Par','Birdie','Eagle','Bogey','Doble +','Albatros','Hoyo en 1']);
 const scores=[1,2,3,4,5,6,7,8,19,...Array(9).fill(null)];assert.deepEqual(Scoring.subtotal(scores,0),{strokes:55,played:9});assert.deepEqual(Scoring.subtotal(scores,9),{strokes:0,played:0});
 const s=M.seed();s.editing=true;Sync.migrate(s);const cap=s.players[4],admin=s.players[0],sig='data:image/jpeg;base64,'+fs.readFileSync(__dirname+'/test-signature.jpg').toString('base64');
 const snapshot=user=>({...structuredClone(s),me:user.id,offlineUntil:Date.now()+60000,permissions:Object.fromEntries(s.groups.map(g=>[g.id,M.canEdit(s,user,g.id)]))});
 const store=new Store();store.r={snapshot:snapshot(cap),pending:[]};const engine=new Engine({store,transport:async()=>{throw Error('sin red');}});await engine.restore(cap.id);
 for(const score of [0,20,43,1.5])await assert.rejects(engine.queue('score',{groupId:'G1',hole:0,score}),/1 y 19/);
 assert.equal(store.r.pending.length,0);await engine.queue('score',{groupId:'G1',hole:0,score:19});assert.equal(view(engine.record).cards.G1.scores[0],19);
 const data={groupId:'G1',captain:admin.id,writer:cap.id,signatures:[sig,sig]};await assert.rejects(engine.queue('finalize',data),/18 hoyos/);
 const scoreOp=score=>({id:crypto.randomUUID(),userId:cap.id,type:'score',groupId:'G1',generation:0,hole:0,score,baseVersion:0,baseScore:null});
 for(const score of [0,20,43,1.5])assert.throws(()=>Sync.apply(s,cap,scoreOp(score)),/1 y 19/);
 assert.equal(s.cards.G1.scores[0],null);Sync.apply(s,cap,scoreOp(19));assert.equal(s.cards.G1.scores[0],19);
 const finalize=user=>({id:crypto.randomUUID(),userId:user.id,type:'finalize',generation:0,...data,scores:[...s.cards.G1.scores],holeVersions:[...s.cards.G1.holeVersions]});
 assert.throws(()=>Sync.apply(s,cap,finalize(cap)),/Faltan/);const op=finalize(admin);Sync.apply(s,admin,op);assert(s.cards.G1.finalized.administrative);assert.equal(s.cards.G1.scores.filter(v=>v===null).length,17);assert(Sync.apply(s,admin,op).duplicate);
 s.cards.G1.finalized=null;store.r={snapshot:snapshot(admin),pending:[]};await engine.restore(admin.id);await engine.queue('finalize',data);assert(view(engine.record).cards.G1.finalized.administrative);
 const t=T.validate({...T.defaults,date:'2026-10-04'});assert.equal(t.date,'2026-10-04');assert.throws(()=>T.validate({...t,date:'2026-02-31'}));assert.throws(()=>T.validate({...t,logo:'https://example.org/logo.jpg'}));
 s.tournament={...t,logo:'data:image/jpeg;base64,'+T.logo(s).bytes.toString('base64')};s.cards.G1.finalized={at:new Date().toISOString(),captain:admin.id,writer:cap.id,signatures:[sig,sig],administrative:true};
 s.cards.G1.scores=[null,3,3,3,5,5,2,1,19,...Array(9).fill(4)];
 fs.writeFileSync(__dirname+'/test-colors.pdf',require('./pdf.cjs')(s,'G1'));
 console.log('OK pendientes: límites completos, dos cifras, colores, subtotales, cierre offline/servidor por rol, logo y fecha configurables.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
