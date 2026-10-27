/* Uses a globally installed TypeScript compiler for syntax-only checks.
   npm run typecheck (after dependency install) is required for semantic typing. */
const fs = require('node:fs'), path = require('node:path');
let ts;
try { ts = require('typescript'); }
catch { try { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
catch { console.error('TypeScript compiler unavailable. Install dependencies and run npm run typecheck.'); process.exit(2); } }
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]); }
let errors = 0, inspected=0;
for (const file of walk(path.join(__dirname,'../src'))) {
  if (!/\.tsx?$/.test(file)) continue;
  const result = ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.Preserve,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}});
  inspected++;
  for (const d of result.diagnostics||[]) if(d.category===ts.DiagnosticCategory.Error) {errors++;console.error(file,ts.flattenDiagnosticMessageText(d.messageText,'\n'));}
}
console.log(`Syntax-only transpilation: ${inspected} TS/TSX files, ${errors} errors`);
process.exitCode = errors > 0 ? 1 : 0;
