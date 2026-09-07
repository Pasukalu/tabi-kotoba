import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/learning-insights.ts', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  context,
);
const { learningInsights } = context.exports;
const entries = [
  { id: 'a', scene: 'hotel' },
  { id: 'b', scene: 'train' },
];
const scenes = [
  { id: 'hotel-1', category: 'hotel', title: '酒店' },
  { id: 'train-1', category: 'train', title: '电车' },
];
const p = {
  completed: ['hotel-1', 'hotel-1', 'removed'],
  attempts: [
    { id: 'a', correct: false, ms: 100, at: 1 },
    { id: 'a', correct: true, ms: 500, at: 2 },
    { id: 'b', correct: true, assisted: true, ms: 200, at: 3 },
  ],
  srs: { a: { due: 20 }, b: { due: 0 }, removed: { due: 0 } },
};
const result = learningInsights(p, entries, scenes, 10);
assert.equal(result.completed, 1);
assert.equal(result.coverage, 50);
assert.equal(result.due, 1);
assert.equal(result.weak.length, 1);
assert.equal(result.weak[0].entry.id, 'b');
assert.equal(result.recommended.category, 'train');
assert.equal(
  learningInsights({ ...p, attempts: [], completed: [] }, [], [], 0).coverage,
  0,
);
console.log(
  'Recommendations ignore removed content, deduplicate completions, and replace obsolete mistakes with newer independent success.',
);
