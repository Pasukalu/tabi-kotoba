import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/transcript.ts', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  context,
);
const { appendTurn } = context.exports;
const initial = appendTurn(
  [],
  'ご予約のお名前をお願いします。',
  'もう一度お願いします。',
);
assert.equal(initial.length, 2);
assert.equal(initial[0].role, 'staff');
const repeated = [
  ...initial,
  { role: 'staff', text: 'ご予約のお名前をお願いします。' },
];
const result = appendTurn(
  repeated,
  'ご予約のお名前をお願いします。',
  'パスカルです。',
);
assert.equal(result.length, 4);
assert.equal(result[3].role, 'user');
assert.equal(repeated.length, 3);
assert.equal(
  appendTurn(
    result,
    'パスポートを拝見してもよろしいでしょうか。',
    'はい、どうぞ。',
  ).length,
  6,
);
console.log(
  'Transcript preserves the question and avoids duplicated staff turns after repetition.',
);
