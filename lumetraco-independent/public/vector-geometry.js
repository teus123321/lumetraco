/* Independent shared geometry: worker, preview and every exporter use these commands. */
(function (root) {
  "use strict";
  const n = v => Math.round(v * 1000) / 1000;
  const point = (loop, i) => [loop[(i * 2 + loop.length) % loop.length], loop[(i * 2 + 1 + loop.length) % loop.length]];
  function ellipseAligned(loop, tolerance) {
    if (loop.length < 16) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < loop.length; i += 2) { minX = Math.min(minX, loop[i]); maxX = Math.max(maxX, loop[i]); minY = Math.min(minY, loop[i+1]); maxY = Math.max(maxY, loop[i+1]); }
    const rx = (maxX-minX)/2, ry = (maxY-minY)/2, cx = (maxX+minX)/2, cy = (maxY+minY)/2;
    if (Math.min(rx,ry) < 5) return null;
    let area = 0;
    for (let i = 0; i < loop.length/2; i++) {
      const a = point(loop,i), b = point(loop,i+1);
      area += a[0]*b[1]-b[0]*a[1];
      // Check vertices AND chord midpoints: rejects rectangles and coarse polygons.
      for (const p of [a,[(a[0]+b[0])/2,(a[1]+b[1])/2]]) {
        const error = Math.abs(Math.hypot((p[0]-cx)/rx,(p[1]-cy)/ry)-1)*Math.min(rx,ry);
        if (error > Math.min(1.2, tolerance)) return null;
      }
    }
    if (Math.abs(Math.abs(area/2)/(Math.PI*rx*ry)-1) > 0.04) return null;
    const k = 0.552284749831, s = area > 0 ? 1 : -1;
    return [['M',cx+rx,cy],['C',cx+rx,cy+s*k*ry,cx+k*rx,cy+s*ry,cx,cy+s*ry],['C',cx-k*rx,cy+s*ry,cx-rx,cy+s*k*ry,cx-rx,cy],['C',cx-rx,cy-s*k*ry,cx-k*rx,cy-s*ry,cx,cy-s*ry],['C',cx+k*rx,cy-s*ry,cx+rx,cy-s*k*ry,cx+rx,cy],['Z']];
  }
  function ellipse(loop,tolerance){
    const aligned=ellipseAligned(loop,tolerance);if(aligned)return aligned;
    if(loop.length<24)return null;
    let area=0,mx=0,my=0,xx=0,yy=0,xy=0;
    for(let i=0;i<loop.length/2;i++){const [x,y]=point(loop,i),[u,v]=point(loop,i+1),cross=x*v-u*y;area+=cross;mx+=(x+u)*cross;my+=(y+v)*cross;xx+=(x*x+x*u+u*u)*cross;yy+=(y*y+y*v+v*v)*cross;xy+=(2*x*y+x*v+u*y+2*u*v)*cross;}
    if(Math.abs(area)<1)return null;
    const cx=mx/(3*area),cy=my/(3*area),vx=xx/(6*area)-cx*cx,vy=yy/(6*area)-cy*cy,cov=xy/(12*area)-cx*cy;
    const angle=.5*Math.atan2(2*cov,vx-vy),cos=Math.cos(angle),sin=Math.sin(angle),spread=Math.hypot(vx-vy,2*cov);
    const rx=2*Math.sqrt(Math.max(0,(vx+vy+spread)/2)),ry=2*Math.sqrt(Math.max(0,(vx+vy-spread)/2));
    if(ry<5||Math.abs(Math.abs(area/2)/(Math.PI*rx*ry)-1)>.04)return null;
    for(let i=0;i<loop.length/2;i++){const a=point(loop,i),b=point(loop,i+1);for(const p of [a,[(a[0]+b[0])/2,(a[1]+b[1])/2]]){const x=p[0]-cx,y=p[1]-cy;const err=Math.abs(Math.hypot((x*cos+y*sin)/rx,(-x*sin+y*cos)/ry)-1)*ry;if(err>Math.min(1.2,tolerance))return null;}}
    const k=.552284749831,direction=area>0?1:-1,transform=(x,y)=>[n(cx+x*cos-y*sin),n(cy+x*sin+y*cos)];
    const out=[['M',...transform(rx,0)]];
    for(let i=0;i<4;i++){const a=direction*i*Math.PI/2,b=direction*(i+1)*Math.PI/2;
      out.push(['C',...transform(rx*(Math.cos(a)-direction*k*Math.sin(a)),ry*(Math.sin(a)+direction*k*Math.cos(a))),...transform(rx*(Math.cos(b)+direction*k*Math.sin(b)),ry*(Math.sin(b)-direction*k*Math.cos(b))),...transform(rx*Math.cos(b),ry*Math.sin(b))]);}
    out.push(['Z']);return out;
  }
  function loopCommands(loop, options = {}) {
    const count = loop.length/2;
    if (count < 3) return [];
    const tolerance = options.tolerance ?? 0.65;
    if (options.curves !== false && !options.rounded) {
      const fitted = ellipse(loop, Math.max(1.2, tolerance));
      if (fitted) return fitted.map(c => c.map((v,i) => i ? n(v) : v));
    }
    const sections = [];
    for (let i=0;i<count;i++) {
      const p=point(loop,i), a=point(loop,i-1), b=point(loop,i+1);
      const l1=Math.hypot(p[0]-a[0],p[1]-a[1]), l2=Math.hypot(b[0]-p[0],b[1]-p[1]);
      const cosine=((p[0]-a[0])*(b[0]-p[0])+(p[1]-a[1])*(b[1]-p[1]))/(l1*l2 || 1);
      // Sharp turns remain exact. Curve displacement is bounded by tolerance.
      const automatic = options.curves !== false && cosine > 0.5 && count > 4;
      const distance = options.rounded ? Math.min(l1,l2)*Math.max(0.02,Math.min(0.45,options.radius ?? 0.22)) : automatic ? Math.min(l1/2,l2/2,2*tolerance) : 0;
      sections.push({p, a:[p[0]+(a[0]-p[0])*distance/(l1||1),p[1]+(a[1]-p[1])*distance/(l1||1)], b:[p[0]+(b[0]-p[0])*distance/(l2||1),p[1]+(b[1]-p[1])*distance/(l2||1)], distance});
    }
    const commands = [['M',...sections[0].b]];
    for (let j=1;j<=count;j++) {
      const t=sections[j%count];
      commands.push(['L',...t.a]);
      if (t.distance) commands.push(['C',t.a[0]+2/3*(t.p[0]-t.a[0]),t.a[1]+2/3*(t.p[1]-t.a[1]),t.b[0]+2/3*(t.p[0]-t.b[0]),t.b[1]+2/3*(t.p[1]-t.b[1]),...t.b]);
    }
    commands.push(['Z']);
    return commands.map(c => c.map((v,i) => i ? n(v) : v));
  }
  function pathCommands(path, options) {
    return path.commands && !options?.rounded ? path.commands : path.loops.flatMap(loop => loopCommands(loop, options ?? {curves:false}));
  }
  function toSvg(commands) { return commands.map(c => c.join(' ')).join(' '); }
  function flatten(commands, tolerance = 0.15) {
    const loops=[]; let loop=[], cursor=[0,0];
    const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy; const t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
    function curve(a,b,c,d,depth=0) {
      if (depth>=16 || Math.max(distance(b,a,d),distance(c,a,d))<=tolerance) {loop.push(...d);return;}
      const ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),m=mid(abc,bcd);
      curve(a,ab,abc,m,depth+1);curve(m,bcd,cd,d,depth+1);
    }
    for(const c of commands) {
      if(c[0]==='M'){loop=[c[1],c[2]];cursor=[c[1],c[2]];}
      else if(c[0]==='L'){cursor=[c[1],c[2]];loop.push(...cursor);}
      else if(c[0]==='C'){const end=[c[5],c[6]];curve(cursor,[c[1],c[2]],[c[3],c[4]],end);cursor=end;}
      else if(c[0]==='Z'){if(loop.length>=8 && loop[0]===loop.at(-2)&&loop[1]===loop.at(-1))loop.splice(-2);if(loop.length>=6)loops.push(loop);loop=[];}
    }
    return loops;
  }
  const api={loopCommands,pathCommands,toSvg,flatten};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  else root.VectorGeometry=api;
})(typeof self!=='undefined'?self:globalThis);
