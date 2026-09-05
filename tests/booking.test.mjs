import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const root = './';
const code = ts.transpileModule(
  fs.readFileSync(root + 'lib/booking.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;
const ctx = {
  exports: {},
  require: (p) =>
    JSON.parse(fs.readFileSync(root + p.replace('@/', ''), 'utf8')),
};
vm.runInNewContext(code, ctx);
const { checkBooking, blankBooking } = ctx.exports;
let count = 0;
function result(step, b, ok) {
  assert.equal(checkBooking(step, b) === null, ok, JSON.stringify({ step, b }));
  count++;
}
const valid = {
  ...blankBooking,
  origin: '東京',
  destination: '京都',
  train: 'hikari-505',
  seat: '18E',
  method: 'ic',
  prepared: true,
  platform: '19',
  car: '7',
};
for (let i = 0; i < 5; i++) result(i, valid, true);
result(0, { ...valid, destination: '東京' }, false);
for (const train of ['nozomi-101', 'nozomi-103', 'kodama-707', 'unknown'])
  result(1, { ...valid, train }, false);
for (const seat of ['18A', '17E', '18D', '99E', ''])
  result(2, { ...valid, seat }, false);
result(3, { ...valid, prepared: false }, false);
result(3, { ...valid, method: 'balance' }, false);
result(3, { ...valid, method: 'paper' }, true);
result(4, { ...valid, platform: '7', car: '19' }, false);
result(5, valid, false);
console.log(JSON.stringify({ bookingChecks: count, status: 'passed' }));
