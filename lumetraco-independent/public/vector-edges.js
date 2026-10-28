/* Exact command-edge operations for the shared-boundary representation. */
(function(root){
 'use strict';
 const key=p=>p.join(',');
 function segments(commands){const result=[];let cursor,start;
  for(const c of commands){if(c[0]==='M'){cursor=c.slice(1);start=cursor;}else if(c[0]==='Z'){if(key(cursor)!==key(start))result.push({a:cursor,c:['L',...start]});cursor=start;}else{result.push({a:cursor,c});cursor=c.slice(-2);}}
  return result;
 }
 function backwards(e){return {a:e.c.slice(-2),c:e.c[0]==='C'?['C',e.c[3],e.c[4],e.c[1],e.c[2],...e.a]:['L',...e.a]};}
 function edgeKey(e){const a=key([...e.a,...e.c]),b=key([...backwards(e).a,...backwards(e).c]);return a<b?a:b;}
 function unique(paths){const map=new Map();paths.forEach((path,index)=>segments(path.commands||[]).forEach(e=>{const k=edgeKey(e);if(!map.has(k))map.set(k,{...e,regions:[]});map.get(k).regions.push(index);}));return [...map.values()];}
 function union(paths){
  const border=unique(paths).filter(e=>e.regions.length===1);const outgoing=new Map();
  border.forEach((e,i)=>{const k=key(e.a);if(!outgoing.has(k))outgoing.set(k,[]);outgoing.get(k).push(i);});
  const used=new Set(),commands=[];
  for(let i=0;i<border.length;i++){if(used.has(i))continue;let e=border[i],index=i;const start=key(e.a);commands.push(['M',...e.a]);
   while(!used.has(index)){used.add(index);commands.push(e.c);const end=key(e.c.slice(-2));if(end===start){commands.push(['Z']);break;}const next=(outgoing.get(end)||[]).filter(j=>!used.has(j));if(!next.length)throw new Error('As bordas editadas não permitem união exata. Desfaça o arredondamento antes de unir.');index=next[0];e=border[index];}
  }
  return commands;
 }
 function gapSvg(paths){
  const format=commands=>commands.map(c=>c.join(' ')).join(' '),groups=new Map();
  for(const e of unique(paths).filter(e=>e.regions.length===2&&e.regions.every(i=>(paths[i].opacity??1)===1))){
   const colors=e.regions.map(i=>paths[i].color),color='#'+[1,3,5].map(i=>Math.round((parseInt(colors[0].slice(i,i+2),16)+parseInt(colors[1].slice(i,i+2),16))/2).toString(16).padStart(2,'0')).join('');
   if(!groups.has(color))groups.set(color,[]);groups.get(color).push(format([['M',...e.a],e.c]));
  }
  if(!groups.size)return '';
  const gaps=[...groups].map(([color,parts])=>`<path d="${parts.join(' ')}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="butt"/>`).join('');
  const clip=paths.map(p=>`<path d="${format(p.commands||[])}" clip-rule="evenodd"/>`).join('');
  return `<defs><clipPath id="lume-gap-clip">${clip}</clipPath></defs><g clip-path="url(#lume-gap-clip)">${gaps}</g>`;
 }
 const api={segments,unique,union,gapSvg};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VectorEdges=api;
})(typeof self!=='undefined'?self:globalThis);
