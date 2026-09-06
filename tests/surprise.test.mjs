import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
function load(file) {
  const context = {
    exports: {},
    Math,
    Date,
    require: (p) => JSON.parse(fs.readFileSync(p.replace('@/', ''), 'utf8')),
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
  return context.exports;
}
const { chooseSurprise, surpriseTasks, surpriseDraftKey } =
  load('lib/surprise.ts');
const { validateProgress, parseBackup } = load('lib/storage.ts');
const scenes = JSON.parse(fs.readFileSync('data/scenarios.json'));
for (const task of surpriseTasks) {
  assert.ok(scenes.some((s) => s.id === task.sceneId));
  assert.ok(task.brief.length > 10);
}
const first = chooseSurprise(
  'all',
  undefined,
  () => 0,
  () => 1000,
);
const second = chooseSurprise(
  'all',
  first.taskId,
  () => 0,
  () => 2000,
);
assert.notEqual(first.taskId, second.taskId);
assert.equal(surpriseDraftKey(first), 'surprise:' + first.taskId + ':1000');
assert.equal(chooseSurprise('missing', undefined), null);
const hotel = chooseSurprise(
  'hotel',
  undefined,
  () => 0.5,
  () => 3000,
);
assert.equal(
  surpriseTasks.find((t) => t.id === hotel.taskId).category,
  'hotel',
);
const base = {
  days: [],
  mastered: [],
  favorites: [],
  completed: [],
  srs: {},
  attempts: [],
  reviews: [],
};
assert.equal(validateProgress(base).surpriseRun, null);
assert.equal(
  parseBackup(
    JSON.stringify({ version: 1, progress: { ...base, surpriseRun: first } }),
  ).progress.surpriseRun.startedAt,
  1000,
);
assert.throws(() =>
  validateProgress({ ...base, surpriseRun: { taskId: 'x', startedAt: -1 } }),
);
assert.throws(() =>
  validateProgress({ ...base, surpriseRun: { taskId: 5, startedAt: 1000 } }),
);
console.log(
  'Surprise practice: 8 tasks, category filtering, repeat avoidance, isolated draft keys and backup migration passed.',
);
