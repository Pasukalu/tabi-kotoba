import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const root = './';
const js = ts.transpileModule(fs.readFileSync(root + 'lib/daily.ts', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const context = {
  exports: {},
  require: (p) =>
    JSON.parse(fs.readFileSync(root + p.replace('@/', ''), 'utf8')),
  Date,
};
vm.runInNewContext(js, context);
const { makeDaily, advanceDaily, completeDailyStep, summarizeDaily } =
  context.exports;
let n = 0;
const check = (v, msg) => {
  assert.ok(v, msg);
  n++;
};
const scenes = JSON.parse(fs.readFileSync(root + 'data/scenarios.json'));
const ids = new Set(scenes.map((s) => s.id));
let run = makeDaily('2026-09-05', 1000);
check(
  JSON.stringify(run) === JSON.stringify(makeDaily('2026-09-05', 1000)),
  'deterministic',
);
check(run.scenes.length === 8, 'eight steps');
check(advanceDaily(run).cursor === 0, 'cannot skip incomplete');
const plans = new Set();
for (let day = 1; day <= 28; day++) {
  const p = makeDaily('2026-09-' + String(day).padStart(2, '0'));
  plans.add(JSON.stringify(p.scenes));
  check(
    p.scenes.every((id) => ids.has(id)),
    'all scene references resolve',
  );
}
check(plans.size > 1, 'day variation');
for (let i = 0; i < 8; i++) {
  const input = [
    { entryId: 'phrases-fine', accepted: true, ms: 1200 },
    { entryId: 'payment-invoice', accepted: false, ms: 15000 },
  ];
  run = completeDailyStep(run, input, 2000 + i);
  run = completeDailyStep(run, input, 2000 + i);
  check(run.records.length === i + 1, 'idempotent completion');
  run = JSON.parse(JSON.stringify(run));
  run = advanceDaily(run, 3000 + i);
  check(run.cursor === i + 1, 'persisted cursor');
  check(run.draft === null, 'new step clears old draft');
}
check(run.finishedAt === 3007, 'finished timestamp');
check(advanceDaily(run).cursor === 8, 'no overflow');
const sum = summarizeDaily(run);
check(
  sum.total === 16 && sum.accepted === 8 && sum.slow === 8,
  'aggregate correct',
);
check(sum.reviewIds.length === 1, 'review deduplicated');
const qs = JSON.parse(fs.readFileSync(root + 'data/context-quiz.json'));
const allIds = new Set(
  [
    ...JSON.parse(fs.readFileSync(root + 'data/payment.json')),
    ...JSON.parse(fs.readFileSync(root + 'data/phrases.json')),
    ...JSON.parse(fs.readFileSync(root + 'data/convenience-store.json')),
    ...JSON.parse(fs.readFileSync(root + 'data/restaurant.json')),
  ].map((e) => e.id),
);
for (const q of qs) {
  check(q.nativeOptions.length === q.options.length, 'native choices align');
  for (const text of [q.nativeContext, ...q.nativeOptions])
    check(
      !/[一-龯々]/.test(text.replace(/\[[^\]]+\]/g, '')),
      'native text has readings',
    );
  check(q.correct >= 0 && q.correct < q.options.length, 'answer in range');
  check(allIds.has(q.entryId), 'quiz review resolves');
}
console.log(JSON.stringify({ dailyAndContextChecks: n, status: 'passed' }));
