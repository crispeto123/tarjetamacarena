const M=require('./model.cjs'),T=require('./tournament.cjs'),Scoring=require('./public/scoring.js');
module.exports=(s,id,format='pdf')=>{
 const drawing=[];
 const g=s.groups.find(g=>g.id===id),c=s.cards[id],total=M.total(s,c),config={...T.defaults,...s.tournament},objects=[],images=[];
 const add=x=>(objects.push(Buffer.isBuffer(x)?x:Buffer.from(x,'latin1')),objects.length);
 const clean=x=>String(x).replace(/[–—]/g,'-').replace(/[^\x20-\xff]/g,'?').replace(/[\\()]/g,'\\$&');
 const rgb=hex=>[1,3,5].map(i=>(parseInt(hex.slice(i,i+2),16)/255).toFixed(3)).join(' ');
 const rel=n=>n===0?'E':n>0?'+'+n:String(n),name=id=>{const p=s.players.find(p=>p.id===id);return p?`${p.name} ${p.surname}`:'Sin asignar';};
 add('<< /Type /Catalog /Pages 2 0 R >>');add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');add('');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 let out='';
 const text=(x,y,value,size=11,color='#15382e',bold=false)=>{drawing.push({type:'text',x,y,value:String(value),size,color,bold});out+=`${rgb(color)} rg BT /F${bold?2:1} ${size} Tf ${x} ${y} Td (${clean(value)}) Tj ET\n`;};
 const rect=(x,y,w,h,color)=>{drawing.push({type:'rect',x,y,w,h,color});out+=`${rgb(color)} rg ${x} ${y} ${w} ${h} re f\n`;};
 const width=(value,size)=>String(value).split('').reduce((n,c)=>n+(' ilI.,:;!|'.includes(c)?.25:'MW@'.includes(c)?.85:.55)*size,0);
 const center=(x,y,w,value,size=11,color='#15382e',bold=false)=>text(x+Math.max(3,(w-width(value,size))/2),y,value,size,color,bold);
 const wrap=(value,max,size)=>{const lines=[];let line='';for(const word of String(value).split(/\s+/)){if(line&&width(line+' '+word,size)>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
 const image=(bytes,w,h,x,y,dw,dh)=>{drawing.push({type:'image',src:'data:image/jpeg;base64,'+bytes.toString('base64'),x,y,w:dw,h:dh});const ref=add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),bytes,Buffer.from('\nendstream')]));const key='Im'+images.length;images.push(`/${key} ${ref} 0 R`);out+=`q ${dw} 0 0 ${dh} ${x} ${y} cm /${key} Do Q\n`;};
 rect(0,824,595,18,'#063f32');
 const logo=T.logo(s),scale=Math.min(116/logo.width,96/logo.height);image(logo.bytes,logo.width,logo.height,34+(116-logo.width*scale)/2,714+(96-logo.height*scale)/2,logo.width*scale,logo.height*scale);
 let titleY=792;for(const line of wrap(config.title,370,19)){text(168,titleY,line,19,'#063f32',true);titleY-=23;}for(const line of wrap(config.subtitle,370,11)){text(168,titleY-2,line,11);titleY-=15;}
 text(168,titleY-10,'Fecha: '+new Date().toLocaleString('es-CO',{timeZone:'America/Bogota',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}),10,'#64786e');
 rect(34,690,527,2,'#d3ac4c');
 let y=664;for(const line of wrap(g.name,260,21)){text(34,y,line,21,'#063f32',true);y-=25;}
 text(310,665,total.played?`${total.strokes} golpes / ${rel(total.relative)}`:'Sin iniciar',24,'#063f32',true);text(310,646,`${total.played}/18 hoyos${total.played&&total.played<18?' · Acumulado parcial':''}`,10);
 text(34,y-1,'Salida: hoyo '+(M.startOf(s,id)||'Sin configurar'),10,'#64786e');y-=22;
 const categories=['1ra','2daA','2daB','3ra'];
 const members=s.members.filter(m=>m.groupId===id).map(m=>({name:name(m.playerId),category:s.players.find(p=>p.id===m.playerId)?.category||''})).sort((a,b)=>categories.indexOf(a.category)-categories.indexOf(b.category)).map(p=>`${p.category} · ${p.name}`);
 const memberSize=members.length>12?8:10;
 for(let i=0;i<members.length;i+=2){let rowHeight=0;for(let j=0;j<2&&i+j<members.length;j++){const x=34+j*220,lines=wrap(members[i+j],206,memberSize);lines.forEach((line,k)=>text(x,y-k*(memberSize+2),line,memberSize));rowHeight=Math.max(rowHeight,lines.length*(memberSize+2));}y-=rowHeight+4;}
 y-=14;
 for(const offset of [0,9]){
  text(34,y,`HOYOS ${offset+1} AL ${offset+9}`,9,'#64786e',true);y-=94;
  const cellW=47,gap=4;
  for(let j=0;j<9;j++){const h=offset+j,x=34+j*(cellW+gap),[key,label,bg,fg]=Scoring.result(c.scores[h],s.course.pars[h]);rect(x,y,cellW,82,bg);if(h===M.startOf(s,id)-1)rect(x,y+79,cellW,3,'#b28a2d');center(x,y+62,cellW,'H'+(h+1),10,fg,true);center(x,y+46,cellW,'PAR '+s.course.pars[h],8,fg);center(x,y+14,cellW,c.scores[h]??'—',22,fg,true);}
  const half=Scoring.subtotal(c.scores,offset),x=493;rect(x,y,68,82,'#edf0ee');center(x,y+61,68,'TOTAL',9);center(x,y+39,68,half.played?half.strokes:'—',21,'#063f32',true);center(x,y+16,68,`${half.played}/9 hoyos`,8);y-=28;
 }
 for(let i=0;i<Scoring.palette.length;i++){const [,label,bg]=Scoring.palette[i],x=34+(i%4)*132,ly=y-Math.floor(i/4)*20;rect(x,ly-2,9,9,bg);text(x+14,ly,label,9);}y-=58;
 const status=c.finalized?(c.finalized.rain?'FINALIZADA POR LLUVIA · '+total.played+'/18 hoyos':c.finalized.administrative?'CIERRE ADMINISTRATIVO · '+total.played+'/18 hoyos':'TARJETA FINALIZADA'):'PROVISIONAL · Tarjeta sin finalizar';
 text(34,y,status,10,'#063f32',true);y-=17;
 if(c.finalized){text(34,y,'Firmada: '+new Date(c.finalized.at).toLocaleString('es-CO',{timeZone:'America/Bogota'}),9,'#64786e');y-=28;for(let i=0;i<2;i++){const x=i?310:34;text(x,y,i?'Capitán del grupo':'Anotador',10,'#063f32',true);text(x,y-16,name(i?c.finalized.captain:c.finalized.writer),10);const bytes=Buffer.from(c.finalized.signatures[i?0:1].split(',')[1],'base64');image(bytes,600,160,x,y-89,245,65);}}
 if(format==='image')return {width:595,height:842,drawing};
 const stream=Buffer.from(out,'latin1'),streamId=add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from('endstream')]));
 objects[2]=Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << ${images.join(' ')} >> >> /Contents ${streamId} 0 R >>`);
 const chunks=[Buffer.from('%PDF-1.4\n')],offsets=[];let length=chunks[0].length;objects.forEach((o,i)=>{offsets.push(length);const b=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),o,Buffer.from('\nendobj\n')]);chunks.push(b);length+=b.length;});chunks.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`));return Buffer.concat(chunks);
};
