import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const context = {
    exports: {},
    require: (p) =>
      p.endsWith('.json')
        ? JSON.parse(fs.readFileSync(p.replace('@/', '')))
        : load('lib/' + p.replace('./', '') + '.ts'),
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    context,
  );
  modules.set(file, context.exports);
  return context.exports;
}
const { sessionFocus } = load('lib/session-focus.ts');
const { allEntries, plain } = load('lib/content.ts');
const results = [
  { natural: 'ありがとうございます。', accepted: true, ms: 1000 },
  { natural: '[予約|よやく]しているパスカルです。', accepted: false, ms: 3000 },
  { natural: '[予約|よやく]しているパスカルです。', accepted: true, ms: 2000 },
  {
    natural: '[少|すこ]し[待|ま]っていただけますか。',
    accepted: true,
    ms: 20000,
  },
];
const focus = sessionFocus(results, 'hotel');
assert.equal(focus.length, 3);
assert.equal(plain(focus[0].japanese), '予約しているパスカルです。');
assert.ok(allEntries.some((e) => e.id === focus[0].id));
assert.equal(plain(focus[1].japanese), '少し待っていただけますか。');
const custom = sessionFocus(
  [
    {
      natural: '[明細|めいさい]をこちらでも[確認|かくにん]します。',
      accepted: false,
      ms: 1000,
      goal: '核对费用明细',
    },
  ],
  'hotel',
)[0];
assert.ok(custom.id.startsWith('course-'));
assert.ok(custom.kana && custom.romaji && custom.chinese);
assert.equal(sessionFocus([], 'hotel').length, 0);
assert.equal(
  sessionFocus(
    Array.from({ length: 10 }, (_, i) => ({
      natural: 'はい。' + i,
      accepted: true,
      ms: 1000,
    })),
    'hotel',
  ).length,
  5,
);
console.log(
  'Session focus: failed and slow goals first, deduplication, authored IDs, stable fallback entries, five-expression limit passed.',
);
