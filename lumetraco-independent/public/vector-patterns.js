/* Conservative local tools: polygon symmetry and translated command matches. */
(function(root){
 'use strict';
 function translatedMatches(paths,index,tolerance=.05){
  const source=paths[index]?.commands;if(!source?.length)return [];
  const origin=source[0].slice(1);
  return paths.flatMap((path,i)=>{
   const commands=path.commands;if(!commands||commands.length!==source.length)return [];
   const dx=commands[0][1]-origin[0],dy=commands[0][2]-origin[1];
   const same=commands.every((c,j)=>c[0]===source[j][0]&&c.length===source[j].length&&c.slice(1).every((v,k)=>Math.abs(v-source[j][k+1]-(k%2?dy:dx))<=tolerance));
   return same?[i]:[];
  });
 }
 function symmetry(commands,axis,tolerance=1){
  if(!['x','y'].includes(axis)||commands.filter(c=>c[0]==='M').length!==1||commands.some(c=>!['M','L','Z'].includes(c[0])))return null;
  let points=commands.filter(c=>c[0]!=='Z').map(c=>c.slice(1));
  if(points.length>1&&points[0][0]===points.at(-1)[0]&&points[0][1]===points.at(-1)[1])points.pop();
  const n=points.length;if(n<3||n>64)return null;
  const dim=axis==='x'?0:1,other=1-dim;
  const center=(Math.min(...points.map(p=>p[dim]))+Math.max(...points.map(p=>p[dim])))/2;
  let best=null;
  for(let shift=0;shift<n;shift++){
   let error=0;const result=points.map((p,i)=>{const q=points[(shift-i+n)%n];error=Math.max(error,Math.hypot(p[dim]-(2*center-q[dim]),p[other]-q[other]));const r=[];r[dim]=(p[dim]+2*center-q[dim])/2;r[other]=(p[other]+q[other])/2;return r;});
   if(error<=tolerance&&(!best||error<best.error))best={error,center,commands:[['M',...result[0]],...result.slice(1).map(p=>['L',...p]),['Z']]};
  }
  return best;
 }
 const api={translatedMatches,symmetry};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VectorPatterns=api;
})(typeof self!=='undefined'?self:globalThis);
