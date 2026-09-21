const {Client}=require('pg');
module.exports=async function(){
 const config=require('./config.cjs').postgres;let db=new Client(config),needsRecovery=false;
 async function connect(){db.on('error',()=>{needsRecovery=true;});await db.connect();
 await db.query('SET search_path=macarena,public');
 if(!(await db.query('SELECT pg_try_advisory_lock(8769) AS locked')).rows[0].locked){await db.end();throw Error('Ya existe una aplicación conectada a esta base');}}
 await connect();
 let version=Number((await db.query('SELECT version FROM app_config WHERE id=1')).rows[0].version);
 const state=(await db.query('SELECT export_state() AS state')).rows[0].state;
 const sessions=(await db.query("SELECT token,jsonb_build_object('id',player_id,'expires',expires_at) AS data FROM sessions")).rows.map(r=>[r.token,r.data]);
 const {rows,columns,order,deletion,count}=require('./normalized.cjs');
 const keys=(t,r)=>JSON.stringify(r.slice(0,count(t)));
 return {state,sessions,async health(){await db.query('SELECT 1');},async recover(){if(!needsRecovery)return null;try{await db.end().catch(()=>{});db=new Client(config);await connect();const recovered=(await db.query('SELECT export_state() AS state,version FROM app_config WHERE id=1')).rows[0];const recoveredSessions=(await db.query("SELECT token,jsonb_build_object('id',player_id,'expires',expires_at) AS data FROM sessions")).rows.map(r=>[r.token,r.data]);version=Number(recovered.version);needsRecovery=false;return {state:recovered.state,sessions:recoveredSessions};}catch(e){needsRecovery=true;e.status=503;throw e;}},async save(next,previous){const old=rows(previous),fresh=rows(next);try{await db.query('BEGIN');const check=await db.query('UPDATE app_config SET version=version+1 WHERE id=1 AND version=$1 RETURNING version',[version]);if(!check.rowCount)throw Error('La base cambió fuera de esta instancia');
 for(const t of deletion){const current=new Set(fresh[t].map(r=>keys(t,r)));for(const r of old[t])if(!current.has(keys(t,r))){const nkeys=count(t);await db.query(`DELETE FROM ${t} WHERE ${columns[t].slice(0,nkeys).map((c,i)=>c+'=$'+(i+1)).join(' AND ')}`,r.slice(0,nkeys));}}
 fresh.members.sort((a,b)=>Number(a[3])-Number(b[3]));
 for(const t of order){const prior=new Map(old[t].map(r=>[keys(t,r),JSON.stringify(r)]));for(const r of fresh[t])if(prior.get(keys(t,r))!==JSON.stringify(r)){const cols=columns[t],nkeys=count(t);await db.query(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT (${cols.slice(0,nkeys).join(',')}) DO UPDATE SET ${cols.slice(nkeys).map(c=>c+'=EXCLUDED.'+c).join(',')}`,r);}}
 await db.query('COMMIT');version++;}catch(e){needsRecovery=true;await db.query('ROLLBACK').catch(()=>{});e.status=503;throw e;}},async saveSessions(entries){try{await db.query('BEGIN');await db.query('DELETE FROM sessions');for(const [token,data] of entries)await db.query('INSERT INTO sessions VALUES($1,$2,$3)',[token,data.id,data.expires]);await db.query('COMMIT');}catch(e){needsRecovery=true;await db.query('ROLLBACK').catch(()=>{});e.status=503;throw e;}}};
};
