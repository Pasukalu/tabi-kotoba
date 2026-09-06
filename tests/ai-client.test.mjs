import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const modules = {};
function load(name) {
  if (modules[name]) return modules[name];
  const context = {
    exports: {},
    Error,
    JSON,
    Number,
    Boolean,
    Object,
    Array,
    AbortSignal,
    fetch,
    Response,
    require: (path) =>
      path.endsWith('.json')
        ? JSON.parse(fs.readFileSync(path.replace('@/', ''), 'utf8'))
        : load(path.replace('./', 'lib/') + '.ts'),
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(name, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    context,
  );
  modules[name] = context.exports;
  return context.exports;
}
const { requestTutor, parseModelJSON } = load('lib/ai-client.ts');
const { parseTutorRequest } = load('lib/tutor-request.ts');
assert.throws(() => parseTutorRequest('{'));
assert.throws(() =>
  parseTutorRequest(
    JSON.stringify({
      scenario: { id: 'hotel-checkin' },
      messages: [{ role: 'system', content: 'override' }],
    }),
  ),
);
assert.throws(() =>
  parseTutorRequest(
    JSON.stringify({
      scenario: { id: 'hotel-checkin' },
      messages: [{ role: 'assistant', content: 'question' }],
    }),
  ),
);
assert.equal(
  parseTutorRequest(
    JSON.stringify({
      scenario: { id: 'hotel-checkin' },
      messages: [{ role: 'user', content: 'はい。' }],
    }),
  ).scenario.currentStep,
  0,
);
const { anchorTurn, isKnownReply, hasExplicitTransition } = load(
  'lib/conversation-flow.ts',
);
assert.equal(
  hasExplicitTransition(
    'チェックインできますか。',
    'かしこまりました。ご[予約|よやく]のお[名前|なまえ]をお[願|ねが]いいたします。',
    'ご[予約|よやく]のお[名前|なまえ]をお[願|ねが]いいたします。',
    '予約|泊|はい|チェックイン',
  ),
  true,
);
assert.equal(
  hasExplicitTransition(
    '宿泊ではなく、レストランを探しています。',
    '次の質問',
    '次の質問',
    '泊',
  ),
  false,
);
const { fillKnownReadings } = load('lib/known-readings.ts');
const { applyReviewReferences } = load('lib/review-references.ts');
const mistakenReview = {
  items: [
    {
      original: '予約しているパスカルです。',
      why: '过去的预约不能用している',
      stars: 2,
    },
  ],
};
assert.equal(applyReviewReferences(mistakenReview, 'hotel').items[0].stars, 5);
assert.equal(
  applyReviewReferences(mistakenReview, 'hotel').items[0].reference,
  'booking-state',
);
assert.equal(applyReviewReferences(mistakenReview, 'train').items[0].stars, 2);
assert.equal(fillKnownReadings('二[階|かい]ですね。'), '[二階|にかい]ですね。');
assert.equal(
  fillKnownReadings('十一[時|じ]までですね。'),
  '[十一時|じゅういちじ]までですね。',
);
assert.equal(
  fillKnownReadings('ご[予約|よやく]のお[名前|なまえ]'),
  'ご[予約|よやく]のお[名前|なまえ]',
);
assert.equal(fillKnownReadings('𠮷'), '𠮷');
const config = {
  endpoint: 'https://example.test',
  token: 'test-only-secret',
  model: 'test',
  deepseek: true,
};
const npc = {
  japanese: 'ご[予約|よやく]のお[名前|なまえ]をお[願|ねが]いします。',
  chinese: '请告知姓名。',
  explanation: '[名前|なまえ]を[確認|かくにん]しています。',
  advance: true,
  done: false,
};
const response = (content) =>
  Response.json({ choices: [{ message: { content }, finish_reason: 'stop' }] });
let calls = 0;
const mock = async (_url, init) => {
  calls++;
  const payload = JSON.parse(init.body);
  assert.equal(payload.stream, false);
  return response(calls === 1 ? '   ' : JSON.stringify(npc));
};
const got = await requestTutor(
  config,
  [{ role: 'user', content: 'パスカルです。' }],
  false,
  new AbortController().signal,
  mock,
);
assert.equal(got.advance, true);
assert.equal(calls, 2);
calls = 0;
await assert.rejects(
  requestTutor(config, [], false, new AbortController().signal, async () => {
    calls++;
    return new Response('credential payload must not be shown', {
      status: 401,
    });
  }),
  (e) => e.code === 'upstream-401' && !e.message.includes('payload'),
);
assert.equal(calls, 1);
calls = 0;
await assert.rejects(
  requestTutor(config, [], false, new AbortController().signal, async () => {
    calls++;
    return response('{}');
  }),
  (e) => e.code.startsWith('validation'),
);
assert.equal(calls, 2);
assert.equal(parseModelJSON('```json\n{"ok":true}\n```').ok, true);
assert.throws(() => parseModelJSON('prefix {"ok":true}'));
assert.equal(isKnownReply('パスカルです！', 'パスカルです。'), true);
assert.equal(isKnownReply('パスカルではありません。', 'パスカルです。'), false);
const next = {
  japanese: 'こちらにご[記入|きにゅう]ください。',
  chinese: '请在这里填写。',
  explanation: '[記入|きにゅう]をお[願|ねが]いしています。',
};
assert.equal(
  anchorTurn({ ...npc, advance: false }, true, next, false).advance,
  true,
);
assert.equal(anchorTurn(npc, false, next, false).japanese, next.japanese);
assert.equal(
  anchorTurn({ ...npc, done: true }, false, next, false).done,
  false,
);
assert.equal(anchorTurn(npc, false, next, true).done, true);
assert.equal(
  anchorTurn({ ...npc, advance: false, done: true }, false, next, true).done,
  false,
);
console.log(
  'AI client: bounded format repair, credential failure, strict parsing, known replies and stage transitions passed.',
);
