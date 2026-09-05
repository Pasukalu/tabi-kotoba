import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const code = ts.transpileModule(fs.readFileSync('lib/audio.ts', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
let voices = [{ lang: 'ja-JP', name: 'Japanese Neural' }],
  utterance;
class Utterance {
  constructor(text) {
    this.text = text;
  }
}
const synth = {
  getVoices: () => voices,
  cancel() {},
  pause() {},
  resume() {},
  speak(u) {
    utterance = u;
    u.onstart?.();
  },
};
const ctx = {
  exports: {},
  window: { speechSynthesis: synth },
  speechSynthesis: synth,
  SpeechSynthesisUtterance: Utterance,
  DOMException,
  Error,
  Promise,
  setTimeout,
  clearTimeout,
  AbortController,
  Blob,
  URL,
  fetch: async () => ({ ok: true, blob: async () => new Blob(['audio']) }),
};
let audio;
ctx.Audio = class {
  constructor() {
    audio = this;
  }
  play() {
    return Promise.resolve();
  }
  pause() {}
};
vm.runInNewContext(code, ctx);
const { BrowserTTS, CloudTTS } = ctx.exports;
let checks = 0;
const check = (v, msg) => {
  assert.ok(v, msg);
  checks++;
};
const browser = new BrowserTTS();
let ended = false,
  callback = 0;
const first = browser
  .play('予約', 1, () => callback++)
  .then(() => (ended = true));
await Promise.resolve();
check(!ended, 'must not finish when queued');
utterance.onend();
await first;
check(ended && callback === 1, 'finishes exactly at end');
utterance.onend();
check(callback === 1, 'end callback once');
const stopped = browser.play('次', 1);
browser.stop();
await assert.rejects(stopped, { name: 'AbortError' });
checks++;
const failed = browser.play('失敗', 1);
utterance.onerror({ error: 'synthesis-failed' });
await assert.rejects(failed, /語音|语音/);
checks++;
voices = [{ lang: 'en-US', name: 'English' }];
await assert.rejects(browser.play('日本語', 1), /日语/);
checks++;
voices = [{ lang: 'ja-JP', name: 'Japanese' }];
const cloud = new CloudTTS();
let cloudDone = false;
const c = cloud.play('こんにちは', 1).then(() => (cloudDone = true));
await new Promise(setImmediate);
check(!cloudDone, 'cloud waits for end');
audio.onended();
await c;
check(cloudDone, 'cloud resolved at end');
const c2 = cloud.play('次', 1);
await new Promise(setImmediate);
cloud.stop();
await assert.rejects(c2, { name: 'AbortError' });
checks++;
let release;
ctx.fetch = () => new Promise((r) => (release = r));
const late = cloud.play('遅延', 1);
cloud.stop();
release({ ok: true, blob: async () => new Blob(['late']) });
await assert.rejects(late, { name: 'AbortError' });
checks++;
console.log(JSON.stringify({ audioLifecycleChecks: checks, status: 'passed' }));
