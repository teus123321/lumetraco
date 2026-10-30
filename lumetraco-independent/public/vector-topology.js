/* Shared boundaries are fitted once and reused in both directions. */
(function(root){
  'use strict';
  const pointKey=p=>p.join(',');
  const key=(a,b)=>{const x=pointKey(a),y=pointKey(b);return x<y?x+'|'+y:y+'|'+x;};
  function reverse(commands){
    const segments=[];let start;
    for(const c of commands){if(c[0]==='M')start=c.slice(1);else if(c[0]!=='Z'){segments.push({start,c});start=c.slice(-2);}}
    if(!segments.length)return commands;
    const out=[['M',...segments.at(-1).c.slice(-2)]];
    for(const {start,c} of segments.reverse())out.push(c[0]==='C'?['C',c[3],c[4],c[1],c[2],...start]:['L',...start]);
    if(commands.at(-1)[0]==='Z')out.push(['Z']);return out;
  }
  function build(rawPaths, simplify, fitClosed, tolerance, curves){
    const edges=new Map(),vertices=new Map();
    rawPaths.forEach((path,region)=>path.loops.forEach(loop=>{
      for(let i=0;i<loop.length;i+=2){const a=loop.slice(i,i+2),b=[loop[(i+2)%loop.length],loop[(i+3)%loop.length]],k=key(a,b);
        if(!edges.has(k)){const e={a,b,regions:[],chain:-1};edges.set(k,e);for(const p of [a,b]){const pk=pointKey(p);if(!vertices.has(pk))vertices.set(pk,[]);vertices.get(pk).push(e);}}
        edges.get(k).regions.push(region);
      }
    }));
    const pair=e=>e.regions.join(',');
    const junction=(p,e)=>{const next=vertices.get(pointKey(p));return next.length!==2||next.some(x=>pair(x)!==pair(e));};
    const chains=[];
    function walk(first,start){
      const points=[start];let edge=first,p=start;const id=chains.length;
      while(edge.chain<0){edge.chain=id;const q=pointKey(edge.a)===pointKey(p)?edge.b:edge.a;points.push(q);if(junction(q,edge)||pointKey(q)===pointKey(start))break;edge=vertices.get(pointKey(q)).find(x=>x!==edge);p=q;}
      // A chain returning to a junction is a lobe of a larger contour, not
      // a standalone closed subpath. Inserting Z here closes the parent early.
      const closed=pointKey(points[0])===pointKey(points.at(-1))&&!junction(start,first);
      let commands;
      if(closed){commands=fitClosed(points.slice(0,-1).flat(),tolerance,curves);}
      else {const reduced=simplify(points,tolerance);commands=[['M',...reduced[0]],...reduced.slice(1).map(p=>['L',...p])];}
      // Open shared chains stay piecewise linear: exact common borders take priority over independent smoothing.
      chains.push({commands,regions:first.regions,points});
    }
    for(const edge of edges.values())if(edge.chain<0&&(junction(edge.a,edge)||junction(edge.b,edge)))walk(edge,junction(edge.a,edge)?edge.a:edge.b);
    for(const edge of edges.values())if(edge.chain<0)walk(edge,edge.a);
    const paths=rawPaths.map(path=>({...path,commands:path.loops.flatMap(loop=>{
      const parts=[];const count=loop.length/2;
      for(let i=0;i<count;i++){const a=loop.slice(i*2,i*2+2),b=[loop[(i*2+2)%loop.length],loop[(i*2+3)%loop.length]];parts.push({edge:edges.get(key(a,b)),a});}
      if(parts.every(p=>p.edge.chain===parts[0].edge.chain)){
        const chain=chains[parts[0].edge.chain];const a=chain.points[0],b=chain.points[1];
        const pos=parts.findIndex(p=>pointKey(p.a)===pointKey(a));const forward=pos>=0&&pointKey(parts[(pos+1)%count].a)===pointKey(b);
        const result=forward?chain.commands:reverse(chain.commands);
        return result.at(-1)[0]==='Z'?result:[...result,['Z']];
      }
      const start=parts.findIndex((p,i)=>p.edge.chain!==parts[(i+count-1)%count].edge.chain);const out=[];let last=-1;
      for(let j=0;j<count;j++){const p=parts[(start+j)%count],id=p.edge.chain;if(id===last)continue;last=id;const chain=chains[id];const commands=pointKey(p.a)===pointKey(chain.points[0])?chain.commands:reverse(chain.commands);out.push(...(out.length?commands.slice(1):commands));}
      out.push(['Z']);return out;
    })}));
    return {paths,sharedBoundaryCount:chains.filter(c=>c.regions.length===2).length};
  }
  const api={build,reverse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VectorTopology=api;
})(typeof self!=='undefined'?self:globalThis);
