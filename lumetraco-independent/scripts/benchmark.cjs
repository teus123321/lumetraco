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
 'ellipse':svg('<ellipse cx="80" cy="80" rx="60" ry="25" fill="#156daf"/>'),
 'corners':svg('<rect x="10" y="15" width="65" height="130" fill="#116633"/><rect x="85" y="15" width="65" height="130" rx="12" fill="#2266cc"/>'),
 'small-text':svg('<rect width="160" height="160" fill="white"/><text x="10" y="80" font-size="12" font-family="sans-serif">Lume 0128 Aa</text>'),
 'thin-lines':svg('<rect width="160" height="160" fill="white"/><path d="M1 0V160M5 20H155M9 100L150 25" stroke="#112244" fill="none"/>'),
 'adjacent':svg('<rect width="160" height="160" fill="#2266cc"/><path d="M0 0H80L120 80L80 160H0Z" fill="#ee7733"/>'),
 'circle':svg('<circle cx="80" cy="80" r="40" fill="#156daf"/>')
};
(async()=>{
 const directory=process.env.BENCHMARK_DIR || "docs/benchmark";fs.mkdirSync(directory,{recursive:true});
 const report=[]; const tiles=[];
 for(const [name,input] of Object.entries(fixtures)){
  const {data,info}=await sharp(input).resize(160,160,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const original=await sharp(data,{raw:info}).png().toBuffer();fs.writeFileSync(`${directory}/${name}-input.png`,original);
  tiles.push({input:await sharp(original).flatten({background:'#ffffff'}).png().toBuffer(),left:0,top:(report.length)*160});
  const row={fixture:name};
  for(const [key,engine] of [['before',baseline],['after',current],['cleanPalette',current]]){
   if(!engine)continue;
   const begin=performance.now();const doc=engine.vectorize({pixels:data,width:160,height:160,options:{colors:10,detail:.65,smoothing:0,cleanPalette:key==='cleanPalette'}});const elapsed=performance.now()-begin;
   const rendered=await sharp(Buffer.from(doc.svg)).ensureAlpha().raw().toBuffer();let error=0;
   for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)for(const bg of [0,255]){const a=data[i+c]*data[i+3]/255+bg*(1-data[i+3]/255), b=rendered[i+c]*rendered[i+3]/255+bg*(1-rendered[i+3]/255);error+=Math.abs(a-b);}
   row[key]={mae:Number((error/(160*160*6)).toFixed(3)),paths:doc.paths.length,segments:doc.nodeCount??doc.paths.reduce((sum,p)=>sum+p.loops.reduce((a,l)=>a+l.length/2,0),0),svgBytes:Buffer.byteLength(doc.svg),milliseconds:Number(elapsed.toFixed(1))};
   fs.writeFileSync(`${directory}/${name}-${key}.svg`,doc.svg);
   tiles.push({input:await sharp(Buffer.from(doc.svg)).flatten({background:'#ffffff'}).png().toBuffer(),left:key==='before'?160:key==='after'?320:480,top:report.length*160});
  }
  report.push(row);
 }
 fs.writeFileSync(`${directory}/results.json`,JSON.stringify(report,null,2)+'\n');
 await sharp({create:{width:640,height:report.length*160,channels:3,background:'white'}}).composite(tiles).png().toFile(`${directory}/comparison.png`);
 console.log(JSON.stringify(report,null,2));
})();
