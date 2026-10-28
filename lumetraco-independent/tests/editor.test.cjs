const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.join(__dirname, '../src/lib/vector-editor.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(output.outputText, filename);
const {renderVector, mostLikelyBackground, pathData, DEFAULT_EXPORT_STYLE} = compiled.exports;
const source = {
  svg: '', paths: [
    { color: '#aabbcc', loops: [[0,0,6,0,6,6,0,6]] },
    { color: '#009955', loops: [[2,2,4,2,4,4,2,4]] }
  ],
  width: 6, height: 6, originalWidth: 60, originalHeight: 60, totalLoops: 2, paletteSize: 2
};
test('per-region recolor emits a real vector SVG and preserves source', () => {
  const result = renderVector(source, { 0: { color: '#123456' } }, DEFAULT_EXPORT_STYLE);
  assert.match(result.svg, /fill="#123456"/);
  assert.match(result.svg, /<path data-region=/);
  assert.doesNotMatch(result.svg, /<image|data:image\/png/);
  assert.equal(source.paths[0].color, '#aabbcc');
});
test('remove region and maintain palette statistics', () => {
  const result = renderVector(source, { 1: { hidden: true } }, DEFAULT_EXPORT_STYLE);
  assert.equal(result.paths.length, 1);
  assert.equal(result.paletteSize, 1);
  assert.equal(result.totalLoops, 1);
});
test('cut preset makes a stroked SVG with no fill', () => {
  const result = renderVector(source, {}, {...DEFAULT_EXPORT_STYLE, drawStyle:'stroke', strokeWidth: 0.5});
  assert.match(result.svg, /fill="none"/);
  assert.match(result.svg, /stroke-width="0.5"/);
});
test('rounded region really contains Bézier curves', () => {
  assert.match(pathData(source.paths[0], true, 0.3), / C /);
  assert.doesNotMatch(pathData(source.paths[0], false), / C /);
});
test('background heuristic uses the largest region', () => {
  assert.equal(mostLikelyBackground(source.paths), '#aabbcc');
});
