(function(root){
 const palette=[['empty','Sin jugar','#edf0ee','#52645e'],['par','Par','#2e6b45','#ffffff'],['birdie','Birdie','#f9d5d5','#941f2d'],['eagle','Eagle','#f7df94','#654b06'],['bogey','Bogey','#b8ddfa','#114b78'],['double','Doble +','#204f83','#ffffff'],['albatross','Albatros','#7536a6','#ffffff'],['ace','Hoyo en 1','#d4af37','#362800']];
 function parse(value){if(value==='')return null;if(!/^\d{1,2}$/.test(String(value))||Number(value)<1||Number(value)>19)throw Error('Registre un número entero entre 1 y 19');return Number(value);}
 function result(value,par){const index=value===null?0:value===1?7:value-par<=-3?6:value-par===-2?3:value-par===-1?2:value===par?1:value-par===1?4:5;return palette[index];}
 function subtotal(scores,offset){const values=scores.slice(offset,offset+9).filter(v=>v!==null);return {played:values.length,strokes:values.reduce((a,b)=>a+b,0)};}
 function nextHole(scores,start){if(!Number.isInteger(start)||start<1||start>18)return -1;return Array.from({length:18},(_,i)=>(start-1+i)%18).find(h=>scores[h]===null)??-1;}
 function canRecord(scores,start,hole){return Number.isInteger(start)&&start>=1&&start<=18&&(scores[hole]!==null||nextHole(scores,start)===hole);}
 function validateSequence(scores,start,hole,value){if(!Number.isInteger(start)||start<1||start>18)throw Error('Configure el hoyo de salida');if(value===scores[hole])return;if(!canRecord(scores,start,hole))throw Error('Primero registre el hoyo '+(nextHole(scores,start)+1));if(value===null){const position=(hole-start+19)%18;for(let i=position+1;i<18;i++)if(scores[(start-1+i)%18]!==null)throw Error('No puede vaciar este hoyo: hay hoyos posteriores registrados. Puede corregir sus golpes.');}}
 const exported={palette,parse,result,subtotal,nextHole,canRecord,validateSequence};if(typeof module!=='undefined')module.exports=exported;else root.MacarenaScoring=exported;
})(typeof window!=='undefined'?window:globalThis);
