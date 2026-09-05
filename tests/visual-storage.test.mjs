import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const load = (file) => {
  const c = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    c,
  );
  return c.exports;
};
const { validateProgress, parseBackup, normalizeSettings } =
  load('lib/storage.ts');
const empty = {
  days: [],
  mastered: [],
  favorites: [],
  completed: [],
  srs: {},
  attempts: [],
  reviews: [],
};
assert.equal(validateProgress(empty).extraEntries.length, 0);
assert.equal(
  parseBackup(
    JSON.stringify({
      version: 1,
      progress: empty,
      settings: { font: 100, voiceName: 'test', speed: 2 },
    }),
  ).settings.font,
  24,
);
assert.equal(normalizeSettings({ speed: 2 }).speed, 1);
assert.throws(() => validateProgress({ ...empty, srs: { x: { due: NaN } } }));
assert.throws(() =>
  validateProgress({
    ...empty,
    attempts: [{ id: 'a', correct: 'yes', ms: 5, at: 1 }],
  }),
);
assert.throws(() =>
  validateProgress({ ...empty, dailyRuns: { x: { cursor: 999 } } }),
);
assert.throws(() =>
  validateProgress({ ...empty, extraEntries: [{ id: 'bad' }] }),
);
assert.throws(() => parseBackup('{broken'));
assert.throws(() =>
  parseBackup(JSON.stringify({ version: 999, progress: empty })),
);
const tasks = JSON.parse(fs.readFileSync('data/visual-tasks.json')),
  entries = JSON.parse(fs.readFileSync('data/visual-phrases.json'));
let count = 9;
for (const task of tasks) {
  assert.ok(task.steps.length >= 3);
  count++;
  for (const step of task.steps) {
    assert.ok(entries.some((e) => e.id === step.entryId));
    assert.ok(step.correct >= 0 && step.correct < step.options.length);
    count += 2;
    for (const text of [
      task.taskJapanese,
      step.heading,
      step.notice,
      ...step.options.map((o) => o.japanese),
    ]) {
      assert.ok(!/[一-龯々]/.test(text.replace(/\[[^\]]+\]/g, '')), text);
      count++;
    }
  }
}
const menus = JSON.parse(fs.readFileSync('data/menu.json'));
for (const m of menus) {
  assert.ok(m.meat && m.method && m.flavor && m.rawRisk && m.components.length);
  count++;
}
console.log(
  JSON.stringify({
    visualTasks: tasks.length,
    menus: menus.length,
    storageAndReadingChecks: count,
    status: 'passed',
  }),
);
