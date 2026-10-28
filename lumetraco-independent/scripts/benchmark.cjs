/* Run with BASELINE_WORKER=/absolute/path/to/old-worker.cjs to compare revisions. */
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const current=require('../public/vector-worker.js');
const baseline=process.env.BASELINE_WORKER ? require(path.resolve(process.env.BASELINE_WORKER)) : null;
const svg=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">${body}</svg>`);
const fixtures={
 'logo':svg('<rect width="160" height="160" fill="#f5f3e8"/><circle cx="80" cy="80" r="40" fill="#176743"/><path d="M65 55H80V95H105V110H65Z" fill="#f5f3e8"/>'),
 'transparent-icon':svg('<circle cx="80" cy="80" r="40" fill="#2277dd" opacity=".5"/>'),
 'illustration':path.resolve('public/demo-art.png'),
 'drawing':svg('<rect width="160" height="160" fill="white"/><path d="M15 120Q30 20 80 80T145 35M20 135L80 15L140 135Z" stroke="#111111" stroke-width="4" fill="none"/>'),
 'photograph':path.resolve('tests/fixtures/astronaut.png'),
 'circle':svg('<circle cx="80" cy="80" r="40" fill="#156daf"/>')
};
(async()=>{
 const report=[]; const tiles=[];
 for(const [name,input] of Object.entries(fixtures)){
  const {data,info}=await sharp(input).resize(160,160,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const original=await sharp(data,{raw:info}).png().toBuffer();fs.writeFileSync(`docs/benchmark/${name}-input.png`,original);
  tiles.push({input:await sharp(original).flatten({background:'#ffffff'}).png().toBuffer(),left:0,top:(report.length)*160});
  const row={fixture:name};
  for(const [key,engine] of [['before',baseline],['after',current]]){
   if(!engine)continue;
   const begin=performance.now();const doc=engine.vectorize({pixels:data,width:160,height:160,options:{colors:10,detail:.65,smoothing:1}});const elapsed=performance.now()-begin;
   const rendered=await sharp(Buffer.from(doc.svg)).ensureAlpha().raw().toBuffer();let error=0;
   for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)for(const bg of [0,255]){const a=data[i+c]*data[i+3]/255+bg*(1-data[i+3]/255), b=rendered[i+c]*rendered[i+3]/255+bg*(1-rendered[i+3]/255);error+=Math.abs(a-b);}
   row[key]={mae:Number((error/(160*160*6)).toFixed(3)),paths:doc.paths.length,segments:doc.nodeCount??doc.paths.reduce((sum,p)=>sum+p.loops.reduce((a,l)=>a+l.length/2,0),0),svgBytes:Buffer.byteLength(doc.svg),milliseconds:Number(elapsed.toFixed(1))};
   fs.writeFileSync(`docs/benchmark/${name}-${key}.svg`,doc.svg);
   tiles.push({input:await sharp(Buffer.from(doc.svg)).flatten({background:'#ffffff'}).png().toBuffer(),left:key==='before'?160:320,top:report.length*160});
  }
  report.push(row);
 }
 fs.writeFileSync('docs/benchmark/results.json',JSON.stringify(report,null,2)+'\n');
 await sharp({create:{width:480,height:report.length*160,channels:3,background:'white'}}).composite(tiles).png().toFile('docs/benchmark/comparison.png');
 console.log(JSON.stringify(report,null,2));
})();
