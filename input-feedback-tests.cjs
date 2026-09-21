const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Scoring=require('./public/scoring.js');
const src=fs.readFileSync(__dirname+'/public/app.js','utf8'),start=src.indexOf('function validateScoreInput('),fn=src.slice(start,src.indexOf("document.addEventListener('input',",start));
const notices=[],box={textContent:''},attrs={},el={value:'2.2',dataset:{group:'G1',hole:'0'},setCustomValidity(v){this.validity=v},setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},getAttribute(k){return attrs[k]},closest(){return {querySelector(){return box}}}};
const context={MacarenaScoring:Scoring,toast:t=>notices.push(t),draftErrors:()=>''};vm.createContext(context);vm.runInContext(fn,context);
for(const v of ['2.2','2,2','20','0','abc']){el.value=v;assert.equal(context.validateScoreInput(el),false);assert.equal(attrs['aria-invalid'],'true');assert.match(box.textContent,/No se permiten decimales/);}
for(const v of ['1','10','19','']){el.value=v;assert.equal(context.validateScoreInput(el),true);assert.equal(el.validity,'');assert.equal(attrs['aria-invalid'],undefined);}
assert(notices.length);console.log('OK: aviso inmediato, rechazo de decimales y fuera de rango, recuperación al corregir.');
