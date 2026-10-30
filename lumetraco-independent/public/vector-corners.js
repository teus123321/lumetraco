/* Local corner edits preserve every unrelated line/cubic and each hole. */
(function(root){
 'use strict';
 function contours(commands){
  const loops=[];let loop=[];
  for(let i=0;i<commands.length;i++){
   const c=commands[i];
   if(c[0]==='M')loop=[{p:c.slice(1),id:i,incoming:null}];
   else if(c[0]==='Z'){
    if(loop.length>1){const first=loop[0],last=loop.at(-1);
     if(first.p[0]===last.p[0]&&first.p[1]===last.p[1]){first.incoming=last.incoming;loop.pop();}
     else first.incoming=['L',...first.p];
     loops.push(loop);
    }
    loop=[];
   } else loop.push({p:c.slice(-2),id:i,incoming:c});
  }
  return loops;
 }
 function candidates(commands){
  return contours(commands).flatMap(loop=>loop.flatMap((v,i)=>{
   const prev=loop[(i+loop.length-1)%loop.length],next=loop[(i+1)%loop.length];
   if(v.incoming[0]!=='L'||next.incoming[0]!=='L')return [];
   const a=[prev.p[0]-v.p[0],prev.p[1]-v.p[1]],b=[next.p[0]-v.p[0],next.p[1]-v.p[1]],la=Math.hypot(...a),lb=Math.hypot(...b);
   const cosine=(a[0]*b[0]+a[1]*b[1])/(la*lb||1),theta=Math.acos(Math.max(-1,Math.min(1,cosine)));
   if(theta<.15||theta>Math.PI-.15)return [];
   return [{id:v.id,x:v.p[0],y:v.p[1],maxRadius:Math.min(la,lb)*.45*Math.tan(theta/2)}];
  }));
 }
 function apply(commands,radii={}){
  if(!Object.values(radii).some(v=>v>0))return commands;
  const allowed=new Map(candidates(commands).map(c=>[c.id,c]));
  return contours(commands).flatMap(loop=>{
   const sections=loop.map((v,i)=>{
    const prev=loop[(i+loop.length-1)%loop.length],next=loop[(i+1)%loop.length],c=allowed.get(v.id);
    const radius=c?Math.max(0,Math.min(c.maxRadius,radii[v.id]||0)):0;
    if(!radius)return {...v,a:v.p,b:v.p,curve:null};
    const u=[prev.p[0]-v.p[0],prev.p[1]-v.p[1]],w=[next.p[0]-v.p[0],next.p[1]-v.p[1]],la=Math.hypot(...u),lb=Math.hypot(...w);
    const theta=Math.acos(Math.max(-1,Math.min(1,(u[0]*w[0]+u[1]*w[1])/(la*lb))));
    const d=radius/Math.tan(theta/2),k=4/3*Math.tan((Math.PI-theta)/4)*radius;
    const a=[v.p[0]+u[0]*d/la,v.p[1]+u[1]*d/la],b=[v.p[0]+w[0]*d/lb,v.p[1]+w[1]*d/lb];
    return {...v,a,b,curve:['C',a[0]-u[0]*k/la,a[1]-u[1]*k/la,b[0]-w[0]*k/lb,b[1]-w[1]*k/lb,...b]};
   });
   const out=[['M',...sections[0].b]];
   for(let j=1;j<=sections.length;j++){
    const s=sections[j%sections.length];out.push(s.incoming[0]==='L'?['L',...s.a]:s.incoming);
    if(s.curve)out.push(s.curve);
   }
   out.push(['Z']);return out;
  });
 }
 const api={candidates,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VectorCorners=api;
})(typeof self!=='undefined'?self:globalThis);
