import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
function load(file, extras = {}) {
  const context = {
    exports: {},
    Error,
    JSON,
    Number,
    Boolean,
    Object,
    Array,
    ...extras,
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    context,
  );
  return context.exports;
}
const config = load('lib/service-config.ts'),
  contract = load('lib/ai-contract.ts');
assert.equal(config.conversationConfig({}), null);
const env = {
  DEEPSEEK_API_KEY: 'test-secret',
  AZURE_SPEECH_KEY: 'speech-secret',
  AZURE_SPEECH_REGION: 'japaneast',
};
assert.equal(
  config.conversationConfig(env).endpoint,
  'https://api.deepseek.com/chat/completions',
);
assert.equal(
  config.conversationConfig({ ...env, DEEPSEEK_MODEL: 'chosen-model' }).model,
  'chosen-model',
);
assert.ok(!JSON.stringify(config.serviceCapabilities(env)).includes('secret'));
const speech = config.speechRequest(env, '<voice>予約 & 確認</voice>', 0.85);
assert.ok(speech.body.includes('rate="-15%"'));
assert.ok(speech.body.includes('&lt;voice&gt;予約 &amp; 確認&lt;/voice&gt;'));
assert.equal(speech.headers['Ocp-Apim-Subscription-Key'], 'speech-secret');
assert.throws(() =>
  config.speechRequest(
    { ...env, AZURE_SPEECH_VOICE: 'en-US-JennyNeural' },
    '予約',
    1,
  ),
);
assert.throws(() =>
  config.speechRequest(
    { ...env, AZURE_SPEECH_REGION: 'example.com/x' },
    '予約',
    1,
  ),
);
const npc = {
  japanese: 'ご[予約|よやく]のお[名前|なまえ]をお[願|ねが]いします。',
  chinese: '请告诉我预约姓名。',
  explanation: '[名前|なまえ]を[尋|たず]ねています。',
  advance: true,
  done: false,
};
assert.equal(contract.validateAIOutput(npc, false).advance, true);
for (const japanese of ['チェックアウト]', '[予約|予約]', '𠮷です。', '[予約]'])
  assert.throws(() => contract.validateAIOutput({ ...npc, japanese }, false));
assert.throws(() =>
  contract.validateAIOutput({ ...npc, japanese: '予約はありますか' }, false),
);
assert.throws(() =>
  contract.validateAIOutput({ ...npc, advance: 'true' }, false),
);
const review = {
  metrics: Object.fromEntries(contract.metricNames.map((k) => [k, null])),
  items: [
    {
      original: '水をください。',
      natural: 'お[水|みず]、お[願|ねが]いします。',
      common: 'お[水|みず]、お[願|ねが]いします。',
      staff: 'かしこまりました。',
      why: '语法正确，可选更柔和说法。',
      written: '否',
      overpolite: '否',
      underpolite: '否',
      stars: 4,
    },
  ],
  remember: [],
};
assert.equal(contract.validateAIOutput(review, true).items[0].stars, 4);
assert.throws(() =>
  contract.validateAIOutput(
    { ...review, items: [{ ...review.items[0], stars: 5000 }] },
    true,
  ),
);
assert.throws(() =>
  contract.validateAIOutput(
    { ...review, metrics: { ...review.metrics, 自然度: NaN } },
    true,
  ),
);
assert.throws(() =>
  contract.validateAIOutput(
    { ...review, items: [{ ...review.items[0], natural: { text: 'bad' } }] },
    true,
  ),
);
console.log(
  '16 service configuration, credential isolation, SSML, and AI response checks passed',
);
