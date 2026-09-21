function text(v,label,max,optional=false){if(typeof v!=='string'||v.includes('\0')||v.length>max||(!optional&&!v.trim()))throw Error(`${label}: texto ${optional?'de 0':'de 1'} a ${max} caracteres`);}
function id(v){text(v,'Cédula',15);if(!/^[0-9]+$/.test(v))throw Error('Cédula: solo dígitos');}
function password(v,optional=false){text(v,'Clave',64,true);if(!optional&&!v.length)throw Error('La clave es obligatoria');}
function master(type,r){if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Registro inválido');
if(type==='players'){id(r.id);text(r.name,'Nombre',80);text(r.surname,'Apellido',80);password(Object.hasOwn(r,'password')?r.password:'',true);if(!['1ra','2daA','2daB','3ra'].includes(r.category)||typeof r.active!=='boolean'||typeof r.admin!=='boolean')throw Error('Categoría o estado inválido');}
if(type==='groups'){text(r.id,'Código',20);if(!/^[a-zA-Z0-9_-]+$/.test(r.id))throw Error('Código de grupo inválido');text(r.name,'Nombre de grupo',100);if(typeof r.active!=='boolean')throw Error('Activo inválido');}
if(type==='course'){text(r.name,'Cancha',100);if(!Array.isArray(r.pars)||r.pars.length!==18||r.pars.some(p=>!Number.isInteger(p)||p<3||p>6))throw Error('Par: entero entre 3 y 6');}
}
module.exports={text,id,password,master};
