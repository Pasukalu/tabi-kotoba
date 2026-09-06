import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const ctx = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/persistence.ts', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  ctx,
);
const { readPreserving, restorePreserving } = ctx.exports;
const values = new Map();
const store = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
};
const validate = (v) => {
  if (!v || typeof v.count !== 'number') throw Error('invalid');
  return v;
};
values.set('progress', '{broken');
let result = readPreserving(store, 'progress', validate, { count: 0 }, 42);
assert.equal(result.canSave, true);
assert.equal(values.get('tabi-recovery:progress:42'), '{broken');
assert.equal(values.get('progress'), '{broken');
values.set('settings', '{"count":7}');
assert.equal(
  readPreserving(store, 'settings', validate, { count: 0 }).value.count,
  7,
);
result = readPreserving(
  {
    ...store,
    setItem: () => {
      throw Error('quota');
    },
  },
  'progress',
  validate,
  { count: 0 },
);
assert.equal(result.canSave, false);
assert.equal(values.get('progress'), '{broken');
values.set('progress', '{"oldFormat":true}');
result = readPreserving(store, 'progress', validate, { count: 0 }, 43);
assert.equal(result.canSave, true);
assert.equal(values.get('tabi-recovery:progress:43'), '{"oldFormat":true}');
result = readPreserving(
  {
    ...store,
    getItem: () => {
      throw Error('denied');
    },
  },
  'progress',
  validate,
  { count: 0 },
);
assert.equal(result.canSave, false);
assert.equal(
  readPreserving(store, 'new', validate, { count: 0 }).canSave,
  true,
);
values.set('tabi-progress-v1', '{"count":5}');
values.set('tabi-settings-v1', '{"font":18}');
let failed = false;
const importing = {
  ...store,
  removeItem: (k) => values.delete(k),
  setItem: (k, v) => {
    if (k === 'tabi-settings-v1' && !failed) {
      failed = true;
      throw Error('quota');
    }
    values.set(k, v);
  },
};
assert.throws(
  () =>
    restorePreserving(importing, {
      progress: { count: 1 },
      settings: { font: 24 },
    }),
  /已恢复/,
);
assert.equal(values.get('tabi-progress-v1'), '{"count":5}');
assert.equal(values.get('tabi-settings-v1'), '{"font":18}');
restorePreserving(importing, {
  progress: { count: 9 },
  settings: { font: 20 },
});
assert.equal(values.get('tabi-progress-v1'), '{"count":9}');
assert.equal(values.get('tabi-settings-v1'), '{"font":20}');
console.log(
  'Persistence: malformed JSON, obsolete structure, independent settings, quota and denied storage preserved.',
);
