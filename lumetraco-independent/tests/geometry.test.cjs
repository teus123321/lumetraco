const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const load = require('./load-ts.cjs');
const {loopCommands,flatten} = require('../public/vector-geometry.js');
const {vectorize} = require('../public/vector-worker.js');
const {renderVector,DEFAULT_EXPORT_STYLE,backgroundRegions} = load(path.resolve(__dirname,'../src/lib/vector-editor.ts'));
const {pdf,postscript,dxf} = load(path.resolve(__dirname,'../src/lib/exporters.ts'));
const rectangle={color:'#aa2244',loops:[[0,0,100,0,100,80,0,80]]};
const source={width:100,height:80,originalWidth:100,originalHeight:80,paths:[rectangle],svg:'',paletteSize:1,totalLoops:1};
test('sharp rectangle retains straight geometry',()=>assert.equal(loopCommands(rectangle.loops[0]).filter(c=>c[0]==='C').length,0));
test('ellipse reduces to four cubic segments and preserves winding',()=>{
 const points=Array.from({length:64},(_,i)=>[50+40*Math.cos(i*Math.PI/32),40+20*Math.sin(i*Math.PI/32)]).flat();
 const c=loopCommands(points);assert.equal(c.filter(x=>x[0]==='C').length,4);
 const flat=flatten(c,.05)[0];
 for(let i=0;i<flat.length;i+=2)assert.ok(Math.abs(Math.hypot((flat[i]-50)/40,(flat[i+1]-40)/20)-1)<.003);
});
test('rounded edits are preserved across SVG PDF EPS and DXF',()=>{
 const doc=renderVector(source,{0:{rounded:true}},DEFAULT_EXPORT_STYLE);
 assert.match(doc.svg,/ C /);assert.match(Buffer.from(pdf(doc)).toString(),/ c\n/);assert.match(postscript(doc),/curveto/);
 const text=dxf(doc);assert.match(text,/AC1015/);assert.match(text,/AcDbPolyline/);
 const vertices=flatten(doc.paths[0].commands)[0];assert.ok(vertices.length>8);
 assert.ok(!vertices.some((x,i)=>i%2===0&&x===100&&vertices[i+1]===0),'sharp corner must not reappear in DXF');
});
test('PDF xref offsets point to real objects and alpha uses a graphics state',()=>{
 const doc=renderVector({...source,paths:[{...rectangle,opacity:.5}]},{},DEFAULT_EXPORT_STYLE);
 const content=Buffer.from(pdf(doc)).toString();
 assert.match(content,/\/ca 0.5/);assert.match(content,/\/GS0 gs/);
 const offset=Number(content.match(/startxref\n(\d+)/)[1]);assert.equal(content.slice(offset,offset+4),'xref');
 const lines=content.slice(offset).split('\n');const count=Number(lines[1].split(' ')[1]);
 for(let i=1;i<count;i++){const start=Number(lines[2+i].slice(0,10));assert.equal(content.slice(start,start+String(i).length+6),`${i} 0 obj`);}
 assert.throws(()=>postscript(doc),/semitransparência/);
});
test('background removal preserves internal regions with the same color',()=>{
 const paths=[rectangle,{color:'#aa2244',loops:[[20,20,30,20,30,30,20,30]]},{color:'#ffffff',loops:[[35,10,90,10,90,70,35,70]]}];
 assert.deepEqual(backgroundRegions({...source,paths},{}),[0]);
 assert.deepEqual(backgroundRegions({...source,paths},{0:{hidden:true}}),[]);
});
test('worker keeps partial alpha instead of making every pixel opaque',()=>{
 const pixels=new Uint8ClampedArray(16*16*4);for(let i=0;i<256;i++)pixels.set([80,120,200,128],i*4);
 const doc=vectorize({pixels,width:16,height:16,options:{colors:2,detail:.7,smoothing:0}});
 assert.equal(doc.paths[0].opacity,128/255);assert.match(doc.svg,/opacity="0.501/);
});
test('invalid numeric options and truncated pixel buffers fail predictably',()=>{
 assert.throws(()=>vectorize({pixels:new Uint8ClampedArray(4),width:2,height:2,options:{colors:2,detail:.7,smoothing:0}}),/Buffer/);
 assert.throws(()=>vectorize({pixels:new Uint8ClampedArray(16),width:2,height:2,options:{colors:NaN,detail:.7,smoothing:0}}),/Opções/);
});
const {unique,union}=require('../public/vector-edges');
const {mergeRegions}=load(path.resolve(__dirname,'../src/lib/vector-editor.ts'));
function blocks(w,h,paint){const pixels=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)pixels.set(paint(x,y),(y*w+x)*4);return vectorize({pixels,width:w,height:h,options:{colors:8,detail:.7,smoothing:0}});}
test('shared curved and junction borders are identical in both directions',()=>{
 const doc=blocks(48,40,(x,y)=>x<18+Math.round(5*Math.sin(y/6))?[255,0,0,255]:y<22?[0,255,0,255]:[0,0,255,255]);
 const edges=unique(doc.paths);assert.ok(edges.some(e=>e.regions.length===2));
 // Every unpaired edge must belong to the exterior rectangular silhouette.
 for(const e of edges.filter(e=>e.regions.length===1)){
  const b=e.c.slice(-2);assert.ok(e.a[0]===b[0]&&(b[0]===0||b[0]===48)||e.a[1]===b[1]&&(b[1]===0||b[1]===40),JSON.stringify(e));
 }
 const merged=union(doc.paths);assert.equal(merged.filter(c=>c[0]==='M').length,1);
 const area=flatten(merged,.01)[0];assert.equal(Math.abs(area.reduce((sum,v,i)=>i%2?sum:sum+v*area[(i+3)%area.length]-area[(i+2)%area.length]*area[i+1],0)/2),48*40);
});
test('merge removes internal boundaries and preserves transparent holes',()=>{
 const doc=blocks(40,40,(x,y)=>x>14&&x<25&&y>14&&y<25?[0,0,0,0]:x<20?[255,0,0,255]:[0,0,255,255]);
 const merged=mergeRegions(doc,{},DEFAULT_EXPORT_STYLE,[0,1]);assert.equal(merged.paths.length,1);assert.equal(merged.paths[0].loops.length,2);
 const total=merged.paths[0].loops.reduce((n,l)=>n+l.reduce((sum,v,i)=>i%2?sum:sum+v*l[(i+3)%l.length]-l[(i+2)%l.length]*l[i+1],0)/2,0);assert.equal(total,1500);
});
test('cut exports emit each shared edge once',()=>{
 const source=blocks(20,10,x=>x<10?[255,0,0,255]:[0,0,255,255]);
 const doc=renderVector(source,{}, {...DEFAULT_EXPORT_STYLE,drawStyle:'stroke',edgeMode:true});
 assert.equal(unique(doc.paths).length,7);assert.equal((doc.svg.match(/<path /g)||[]).length,7);
 assert.equal((dxf(doc).match(/\nLINE\n/g)||[]).length,7);
 assert.equal((Buffer.from(pdf(doc)).toString().match(/\nS\n/g)||[]).length,7);
 assert.equal((postscript(doc).match(/\nstroke\n/g)||[]).length,7);
});
test('very faint alpha and edited opacity survive SVG and PDF',()=>{
 const source=blocks(8,8,()=>[255,0,0,4]);assert.equal(source.paths[0].opacity,4/255);
 const doc=renderVector(source,{0:{opacity:.25}},DEFAULT_EXPORT_STYLE);assert.match(doc.svg,/opacity="0.25"/);assert.match(Buffer.from(pdf(doc)).toString(),/\/ca 0.25/);
});
test('output scale changes dimensions without changing path coordinates',()=>{
 const doc=renderVector(source,{}, {...DEFAULT_EXPORT_STYLE,outputScale:2});assert.equal(doc.originalWidth,200);assert.match(doc.svg,/width="200" height="160"/);assert.deepEqual(doc.paths[0].loops,source.paths[0].loops);
});
test('gap cover is restricted to opaque shared borders',()=>{
 const source=blocks(20,10,x=>x<10?[255,0,0,255]:[0,0,255,255]);
 const doc=renderVector(source,{}, {...DEFAULT_EXPORT_STYLE,gapFill:true});assert.match(doc.svg,/stroke="#800080"/);
 const alpha=renderVector(source,{0:{opacity:.5}}, {...DEFAULT_EXPORT_STYLE,gapFill:true});assert.doesNotMatch(alpha.svg,/stroke="#800080"/);
});
test('rotated ellipses fit four cubics without accepting rectangles',()=>{
 const angle=.62,c=Math.cos(angle),s=Math.sin(angle);
 const points=Array.from({length:128},(_,i)=>{const x=40*Math.cos(i*Math.PI/64),y=17*Math.sin(i*Math.PI/64);return [70+x*c-y*s,60+x*s+y*c];}).flat();
 const commands=loopCommands(points);assert.equal(commands.filter(c=>c[0]==='C').length,4);
 const loop=flatten(commands,.03)[0];for(let i=0;i<loop.length;i+=2){const x=loop[i]-70,y=loop[i+1]-60;assert.ok(Math.abs(Math.hypot((x*c+y*s)/40,(-x*s+y*c)/17)-1)<.004);}
 const box=[[-40,-17],[40,-17],[40,17],[-40,17]].map(([x,y])=>[70+x*c-y*s,60+x*s+y*c]).flat();assert.equal(loopCommands(box).filter(c=>c[0]==='C').length,0);
});
const corners=require('../public/vector-corners');
test('individual radius changes one corner, keeps other corners and hole, is reversible',()=>{
 const commands=[['M',0,0],['L',100,0],['L',100,80],['L',0,80],['Z'],['M',20,20],['L',20,30],['L',30,30],['L',30,20],['Z']];
 const original=JSON.stringify(commands),edited=corners.apply(commands,{1:10});
 assert.equal(edited.filter(c=>c[0]==='C').length,1);assert.equal(edited.filter(c=>c[0]==='Z').length,2);
 const curve=edited.find(c=>c[0]==='C');
 [95.5228475,0,100,4.4771525,100,10].forEach((v,i)=>assert.ok(Math.abs(curve[i+1]-v)<1e-6));
 assert.equal(JSON.stringify(commands),original);assert.deepEqual(corners.apply(commands,{1:0}),commands);
});
test('corner edit is identical in preview SVG and exported PDF EPS DXF geometry',()=>{
 const path={...rectangle,commands:[['M',0,0],['L',100,0],['L',100,80],['L',0,80],['Z']]};
 const doc=renderVector({...source,paths:[path]},{0:{corners:{1:10}}},DEFAULT_EXPORT_STYLE);
 assert.equal(doc.paths[0].commands.filter(c=>c[0]==='C').length,1);
 assert.match(doc.svg,/ C /);assert.match(Buffer.from(pdf(doc)).toString(),/ c\n/);assert.match(postscript(doc),/curveto/);assert.match(dxf(doc),/LWPOLYLINE/);
});
test('physical dimensions agree across SVG PDF EPS DXF at 96dpi',()=>{
 const doc=renderVector({...source,originalWidth:96,originalHeight:96},{},{...DEFAULT_EXPORT_STYLE,unit:'mm',groupByColor:true});
 assert.match(doc.svg,/width="25.4mm" height="25.4mm"/);assert.match(doc.svg,/<g data-color=/);
 assert.match(Buffer.from(pdf(doc)).toString(),/MediaBox \[0 0 72 72\]/);
 assert.match(postscript(doc),/%%BoundingBox: 0 0 72 72/);assert.match(dxf(doc),/\$INSUNITS\n70\n4\n/);
});
test('chains returning to a junction never close the parent contour early',()=>{
 const doc=blocks(32,32,(x,y)=>((x*19+y*7+x*y)%11)<3?[255,0,0,255]:[0,80,200,255]);
 for(const p of doc.paths){
  let open=false;
  for(const c of p.commands){if(c[0]==='M'){assert.equal(open,false);open=true;}else if(c[0]==='Z'){assert.equal(open,true);open=false;}else assert.equal(open,true,'drawing after premature close');}
  assert.equal(open,false);assert.equal(p.commands.filter(c=>c[0]==='Z').length,p.loops.length);
 }
});
const patterns=require('../public/vector-patterns');
test('symmetry corrects a near-symmetric polygon and rejects curves/large errors',()=>{
 const polygon=[['M',0,0],['L',10,0],['L',9.5,10],['L',0,10],['Z']];
 const result=patterns.symmetry(polygon,'x');assert.ok(result);assert.equal(result.error,.5);
 assert.deepEqual(result.commands,[['M',0,0],['L',10,0],['L',9.75,10],['L',.25,10],['Z']]);
 assert.equal(patterns.symmetry([['M',0,0],['L',10,0],['L',6,10],['L',0,10],['Z']],'x'),null);
 assert.equal(patterns.symmetry(loopCommands(Array.from({length:64},(_,i)=>[50+40*Math.cos(i*Math.PI/32),40+20*Math.sin(i*Math.PI/32)]).flat()),'x'),null);
});
test('repeated shape matching requires identical geometry up to translation',()=>{
 const a=[['M',0,0],['L',10,0],['L',10,10],['L',0,10],['Z']];
 const b=a.map(c=>c.map((v,i)=>i?v+20:v)),c=a.map(c=>c.map((v,i)=>i?v*2:v));
 assert.deepEqual(patterns.translatedMatches([{commands:a},{commands:b},{commands:c}],0),[0,1]);
});
