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
