const test = require('node:test');
const assert = require('node:assert/strict');
const { vectorize } = require('../public/vector-worker.js');
function image(w, h, paint, options = {}) {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y*w+x)*4;
    const color = paint(x,y);
    for (let c=0; c<4; c++) pixels[i+c] = color[c];
  }
  return vectorize({width:w,height:h,outputWidth:w,outputHeight:h,pixels,options:{colors:8,detail:.7,smoothing:0,...options}});
}
test('solid input produces one genuinely vector rectangle', () => {
  const doc=image(12,10,()=>[24,78,155,255]);
  assert.equal(doc.paletteSize,1);
  assert.equal(doc.totalLoops,1);
  assert.match(doc.svg, /<path fill="#184e9b"/);
  assert.match(doc.svg, /viewBox="0 0 12 10"/);
  assert.doesNotMatch(doc.svg, /<image|data:image/);
});
test('transparent area remains transparent', () => {
  const doc=image(10,10,(x)=> x<5 ? [0,0,0,0] : [220,40,40,255]);
  assert.equal(doc.paletteSize,1);
  assert.equal(doc.totalLoops,1);
  assert.doesNotMatch(doc.svg, /<rect[^>]*fill="white"/);
});
test('two separated colors create two independently filled vector regions', () => {
  const doc=image(24,12,(x)=>x<12?[232,34,23,255]:[15,89,233,255]);
  assert.equal(doc.paletteSize,2);
  assert.equal(doc.paths.length,2);
});
test('holes are represented by evenodd contour paths', () => {
  const doc=image(20,20,(x,y)=>(x>4&&x<15&&y>4&&y<15)?[0,0,0,0]:[0,80,100,255]);
  assert.equal(doc.totalLoops,2);
  assert.match(doc.svg,/fill-rule="evenodd"/);
});
test('fully transparent images return valid empty SVG', () => {
  const doc=image(5,5,()=>[0,0,0,0]);
  assert.equal(doc.paths.length,0);
  assert.match(doc.svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
});
test('output is stable across repeated processing', () => {
  const gradient=(x,y)=>[(x*13+y*5)%256,(x*9)%256,(y*19)%256,255];
  assert.equal(image(28,28,gradient).svg,image(28,28,gradient).svg);
});
test('rejects working dimensions above safety limit', () => {
  assert.throws(()=>vectorize({width:1200,height:1200,pixels:new Uint8ClampedArray(4),options:{colors:8,detail:1,smoothing:0}}),/Invalid working dimensions/);
});
test('disconnected regions with the same color are independently editable', () => {
  const doc = image(24, 10, (x, y) => ((x >= 2 && x <= 6 && y >= 2 && y <= 7) || (x >= 16 && x <= 20 && y >= 2 && y <= 7)) ? [10, 90, 30, 255] : [0, 0, 0, 0]);
  assert.equal(doc.paletteSize, 1);
  assert.equal(doc.paths.length, 2);
  assert.equal(doc.paths.every(p => p.loops.length === 1), true);
});
test('holes remain connected to their containing region', () => {
  const doc = image(24, 24, (x,y) => (x>=4 && x<=19 && y>=4 && y<=19 && !(x>=9&&x<=14&&y>=9&&y<=14)) ? [200, 60, 80, 255] : [0,0,0,0]);
  assert.equal(doc.paths.length, 1);
  assert.equal(doc.paths[0].loops.length, 2);
});
test('automatic palette recognizes a small flat palette deterministically',()=>{
 const doc=image(30,12,x=>x<10?[255,0,0,255]:x<20?[0,255,0,255]:[0,0,255,255],{autoColors:true});assert.equal(doc.paletteSize,3);
});

test('palette includes small features between regular sampling positions',()=>{
 const doc=image(256,256,(x,y)=>x===1&&y<8?[255,0,0,255]:[255,255,255,255],{colors:2});
 assert.equal(doc.paletteSize,2);assert.ok(doc.paths.some(p=>p.color==='#ff0000'));
});
test('1024px analysis preserves a one-pixel line without upscaling the output',()=>{
 const doc=image(1024,16,(x)=>x===501?[0,0,0,255]:[255,255,255,255],{colors:2});
 assert.equal(doc.width,1024);assert.equal(doc.paths.length,3);
});
