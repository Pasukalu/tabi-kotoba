import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
function load(file) {
  const ctx = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    ctx,
  );
  return ctx.exports;
}
const { reviewQueue, advanceReview } = load('lib/review-session.ts');
const { validateProgress, parseBackup } = load('lib/storage.ts');
const entries = [
  { id: 'a', scene: 'hotel' },
  { id: 'b', scene: 'train' },
  { id: 'c', scene: 'hotel' },
];
const srs = {
  a: { due: 0, wrong: 0 },
  b: { due: 0, wrong: 5 },
  c: { due: 0, wrong: 2 },
  missing: { due: 0, wrong: 100 },
  future: { due: 99999, wrong: 100 },
};
assert.equal(reviewQueue(entries, srs, 10, 'all', 1).join(','), 'b');
assert.equal(reviewQueue(entries, srs, 10, 'hotel', 20).join(','), 'c,a');
const session = {
  ids: ['a', 'b'],
  cursor: 0,
  correct: 0,
  paused: false,
  startedAt: 1,
};
const next = advanceReview(session, 'a', true);
assert.equal(next.cursor, 1);
assert.equal(next.correct, 1);
assert.equal(advanceReview(next, 'a', true), next);
assert.equal(advanceReview({ ...next, paused: true }, 'b', false).cursor, 1);
const base = {
  days: [],
  mastered: [],
  favorites: [],
  completed: [],
  srs: {},
  attempts: [],
  reviews: [],
};
assert.equal(validateProgress(base).reviewSession, null);
const restored = parseBackup(
  JSON.stringify({ version: 1, progress: { ...base, reviewSession: next } }),
).progress.reviewSession;
assert.equal(restored.cursor, 1);
for (const mode of ['listening', 'reading', 'production']) {
  const savedMode = validateProgress({
    ...base,
    reviewSession: { ...next, mode },
  }).reviewSession;
  assert.equal(savedMode.mode, mode);
  assert.equal(advanceReview(savedMode, 'b', true).mode, mode);
}
assert.throws(() =>
  validateProgress({ ...base, reviewSession: { ...next, mode: 'unknown' } }),
);
assert.throws(() =>
  validateProgress({ ...base, reviewSession: { ...next, cursor: 3 } }),
);
assert.throws(() =>
  validateProgress({ ...base, reviewSession: { ...next, ids: ['a', 'a'] } }),
);
console.log(
  'Review sessions: priority, scene filter, batch limit, idempotent advancement, pause and backup migration passed.',
);
