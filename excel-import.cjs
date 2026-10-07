const ExcelJS=require('exceljs'),yauzl=require('yauzl'),JSZip=require('jszip'),crypto=require('node:crypto');
const {promisify}=require('node:util'),scrypt=promisify(crypto.scrypt),M=require('./model.cjs');
const HEADERS=['Cedula','Nombre','Apellido','Categoria','Clave','Activo','CodigoGrupo','HoyoSalida','Capitan'];
const MAX_BYTES=1024*1024,MAX_ROWS=1000;
function invalid(errors){return Object.assign(Error('Archivo rechazado. No se guardó ningún dato.'),{status:422,importErrors:errors});}
function issue(row,column,message){return {sheet:'Carga',row,column,message};}
function fail(message){throw invalid([issue(0,'Archivo',message)]);}
// Bound the actual inflated ZIP content before allowing the XLSX reader to load it.
async function checkZip(buffer){await new Promise((resolve,reject)=>{
 yauzl.fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true},(err,zip)=>{
  if(err)return reject(err);let bytes=0,count=0;const names=new Set();
  const stop=e=>{zip.close();reject(e);};zip.on('error',stop);zip.on('end',resolve);
  zip.on('entry',entry=>{
   if(++count>200||names.has(entry.fileName)||entry.uncompressedSize>12*1024*1024||/vbaProject|externalLinks/i.test(entry.fileName))return stop(Error('ZIP no permitido'));
   names.add(entry.fileName);zip.openReadStream(entry,(e,stream)=>{if(e)return stop(e);stream.on('error',stop);stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>12*1024*1024){stream.destroy();stop(Error('ZIP demasiado grande'));}});stream.on('end',()=>zip.readEntry());});
  });zip.readEntry();
 });
});}
// ExcelJS expects unprefixed SpreadsheetML tags. The supplied template uses
// an equivalent namespace prefix; normalize only XML markup, never cell text.
async function compatibleWorkbook(buffer){
 const zip=await JSZip.loadAsync(buffer);let changed=false;
 for(const entry of Object.values(zip.files)){
  if(entry.dir||!entry.name.endsWith('.xml'))continue;
  let xml=await entry.async('string');const ns=xml.match(/xmlns:([A-Za-z_][\w-]*)="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/);
  if(!ns)continue;
  const prefix=ns[1];xml=xml.replace(ns[0],'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(new RegExp('<(/?)'+prefix+':','g'),'<$1');
  zip.file(entry.name,xml);changed=true;
 }
 return changed?zip.generateAsync({type:'nodebuffer'}):buffer;
}
async function readFile(base64){
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX_BYTES/3)*4||!base64.length||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))fail('Seleccione un archivo .xlsx de máximo 1 MB.');
 const buffer=Buffer.from(base64,'base64');if(buffer.length>MAX_BYTES)fail('El archivo supera 1 MB.');
 let workbook;try{await checkZip(buffer);workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await compatibleWorkbook(buffer),{ignoreNodes:['tableParts']});}catch{fail('No se pudo leer el Excel. Use la plantilla .xlsx sin macros ni vínculos externos.');}
 if(workbook.worksheets.length!==1||workbook.worksheets[0].name!=='Carga')fail('El libro debe contener una única hoja llamada Carga.');
 const sheet=workbook.worksheets[0];if(sheet.model.merges?.length)fail('No se permiten celdas combinadas.');
 const errors=[],rows=[];
 HEADERS.forEach((h,i)=>{if(sheet.getRow(1).getCell(i+1).value!==h)errors.push(issue(1,h,'Encabezado esperado: '+h+'.'));});
 sheet.eachRow((row,n)=>{
  const populated=[];row.eachCell((cell,c)=>{if(cell.value!==null&&cell.value!=='')populated.push([c,cell.value]);});
  if(!populated.length)return;
  for(const [c] of populated)if(c>HEADERS.length)errors.push(issue(n,'Columna '+c,'Columna adicional no permitida.'));
  if(n===1)return;
  if(n>MAX_ROWS+1){errors.push(issue(n,'Fila','Solo se permiten las filas 2 a 1001.'));return;}
  const values=HEADERS.map((_,i)=>row.getCell(i+1).value);
  rows.push({row:n,values});
 });
 if(!rows.length)errors.push(issue(2,'Fila','El archivo no contiene jugadores.'));
 if(errors.length)throw invalid(errors);
 return {rows,digest:crypto.createHash('sha256').update(buffer).digest('hex')};
}
function validate(state,rows){
 const errors=[],records=[],ids=new Map(),groups=new Map();
 const add=(r,c,m)=>errors.push(issue(r,c,m));
 for(const {row,values}of rows){
  const v=[...values];
  for(const i of [0,6])if(typeof v[i]==='number'){
   if(Number.isSafeInteger(v[i])&&v[i]>=0&&v[i]<=999999999999999)v[i]=String(v[i]);
   else add(row,HEADERS[i],'Use un entero no negativo de hasta 15 dígitos, o escriba el identificador como texto. No se permiten decimales ni números cuya precisión pueda haberse perdido en Excel.');
  }
  const [id,name,surname,category,password,active,groupId,start,captain]=v;
  for(let i=0;i<v.length;i++)if(i!==7&&(typeof v[i]!=='string'||!v[i].length||v[i].includes('\0')))add(row,HEADERS[i],'Campo obligatorio de tipo texto; no se permiten fórmulas, fechas ni otros tipos.');
  if(typeof id==='string'){
   if(!/^[0-9]{1,15}$/.test(id))add(row,'Cedula','Debe contener entre 1 y 15 dígitos, sin espacios ni separadores.');
   if(ids.has(id))add(row,'Cedula','Cédula repetida en la fila '+ids.get(id)+'.');else ids.set(id,row);
   if(state.players.some(p=>p.id===id))add(row,'Cedula','La cédula ya existe en la aplicación. Esta carga no actualiza jugadores.');
   if(state.members.some(m=>m.playerId===id))add(row,'Cedula','El jugador ya pertenece a un grupo.');
  }
  for(const [value,column] of [[name,'Nombre'],[surname,'Apellido']])if(typeof value==='string'&&(!value.trim()||value.length>80))add(row,column,'Texto obligatorio de máximo 80 caracteres.');
  if(!M.categories.includes(category))add(row,'Categoria','Use 1ra, 2daA, 2daB o 3ra.');
  if(typeof password==='string'&&(password.length<1||password.length>64))add(row,'Clave','Debe tener entre 1 y 64 caracteres.');
  if(!['SI','NO'].includes(active))add(row,'Activo','Use SI o NO.');
  if(!['SI','NO'].includes(captain))add(row,'Capitan','Use SI o NO.');
  if(!Number.isInteger(start)||start<1||start>18)add(row,'HoyoSalida','Debe ser un número entero entre 1 y 18.');
  if(typeof groupId==='string'){
   if(!/^[a-zA-Z0-9_-]{1,20}$/.test(groupId))add(row,'CodigoGrupo','Use de 1 a 20 letras, dígitos, guiones o guiones bajos.');
   const g=state.groups.find(g=>g.id===groupId);
   if(!g)add(row,'CodigoGrupo','El grupo no existe. Créelo primero en Grupos.');
   else{
    if(!g.active)add(row,'CodigoGrupo','El grupo está inactivo.');
    if(g.rosterClosed)add(row,'CodigoGrupo','El grupo está cerrado. Ábralo antes de cargar integrantes.');
    const card=state.cards[groupId];if(card&&(card.finalized||card.scores.some(v=>v!==null)))add(row,'CodigoGrupo','El grupo tiene golpes registrados o una tarjeta finalizada.');
   }
   if(!groups.has(groupId))groups.set(groupId,[]);groups.get(groupId).push({row,start,captain:captain==='SI',active:active==='SI'});
  }
  if(captain==='SI'&&active!=='SI')add(row,'Capitan','El capitán debe estar activo.');
  records.push({row,id,name:typeof name==='string'?name.trim():name,surname:typeof surname==='string'?surname.trim():surname,category,password,active:active==='SI',groupId,start,captain:captain==='SI'});
 }
 for(const [id,items] of groups){
  const existing=state.members.filter(m=>m.groupId===id),starts=new Set([...existing.map(m=>m.start),...items.map(m=>m.start)]);
  if(starts.size>1)for(const item of items)add(item.row,'HoyoSalida','Todos los integrantes del grupo deben tener el mismo hoyo, incluidos los existentes.');
  const captains=existing.filter(m=>m.captain).length+items.filter(m=>m.captain).length;
  if(captains!==1)for(const item of items)add(item.row,'Capitan','El grupo debe tener exactamente un capitán, incluidos los integrantes existentes.');
 }
 if(!errors.length){
  const next=structuredClone(state);for(const r of records){next.players.push({id:r.id,name:r.name,surname:r.surname,category:r.category,active:r.active,admin:false,passwordHash:'validacion'});next.members.push({playerId:r.id,groupId:r.groupId,start:r.start,captain:r.captain});}
  try{M.validate(next);}catch(e){add(0,'Relaciones',e.message);}
 }
 if(errors.length)throw invalid(errors);
 return {records,summary:{players:records.length,members:records.length,groups:groups.size}};
}
async function prepare(state,records,vault){
 const next=structuredClone(state);
 for(const r of records){const salt=crypto.randomBytes(16).toString('hex');const hash=await scrypt(r.password,salt,64);next.players.push({id:r.id,name:r.name,surname:r.surname,category:r.category,active:r.active,admin:false,passwordHash:salt+':'+hash.toString('hex'),passwordEncrypted:vault.encrypt(r.password)});next.members.push({playerId:r.id,groupId:r.groupId,start:r.start,captain:r.captain});}
 M.validate(next);return next;
}
module.exports={readFile,validate,prepare,HEADERS,MAX_ROWS,MAX_BYTES};
