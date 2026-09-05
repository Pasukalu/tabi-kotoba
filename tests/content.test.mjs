import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const root = './';
const js = ts.transpileModule(
  fs.readFileSync(root + 'lib/content.ts', 'utf8'),
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
vm.runInNewContext(js, ctx);
const c = ctx.exports;
let assertions = 0;
const check = (x, msg) => {
  assert.ok(x, msg);
  assertions++;
};
const ids = new Set();
for (const e of c.allEntries) {
  check(!ids.has(e.id), 'duplicate ' + e.id);
  ids.add(e.id);
  check(e.kana && e.romaji && e.chinese, 'missing field ' + e.id);
  check(
    !/[一-龯々]/.test(e.japanese.replace(/\[[^\]]+\]/g, '')),
    'unannotated kanji ' + e.id,
  );
  check(!/[一-龯々]/.test(c.kana(e.japanese)), 'kana contains kanji ' + e.id);
}
check(c.plain('[予約|よやく]しています。') === '予約しています。', 'plain');
check(c.kana('[予約|よやく]しています。') === 'よやくしています。', 'kana');
check(c.roman('[予約|よやく]') === 'yoyaku', 'roman');
check(c.roman('はい。') === 'hai.', 'hai');
for (const q of ['退房', 'チェックアウト', 'せいひょうき', 'yoyaku'])
  check(c.searchEntries(q).length > 0, 'search ' + q);
const scenes = JSON.parse(fs.readFileSync(root + 'data/scenarios.json'));
for (const s of scenes) {
  for (const step of s.steps) {
    check(
      new RegExp(step.accept, 'i').test(c.plain(step.reply)),
      'example does not pass ' + s.id + ' ' + step.reply,
    );
    const npc =
      c.allEntries.find((e) => e.id === step.npc)?.japanese || step.npc;
    check(
      !/[一-龯々]/.test(npc.replace(/\[[^\]]+\]/g, '')),
      'npc lacks reading ' + npc,
    );
  }
}
console.log(
  JSON.stringify({
    entries: c.allEntries.length,
    words: c.words.length,
    scenarios: scenes.length,
    assertions,
    status: 'passed',
  }),
);
