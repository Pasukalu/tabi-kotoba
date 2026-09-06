import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
const context = { exports: {}, URL };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/offline.ts', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  context,
);
const { cacheableLearningUrl, offlineCache } = context.exports;
const origin = 'https://example.com';
for (const p of [
  '/api/conversation',
  '/api',
  '/auth/login',
  '/__debug',
  'https://other.example/a',
  '/node_modules/react',
  '/@vite/client',
])
  assert.equal(cacheableLearningUrl(p, origin), null);
assert.equal(
  cacheableLearningUrl('/scenes?category=hotel#main', origin),
  origin + '/scenes?category=hotel',
);
const handlers = {};
const looked = [];
const sw = {
  self: {
    addEventListener: (name, fn) => (handlers[name] = fn),
    location: { origin },
  },
  URL,
  Response,
  fetch: async () => {
    throw Error('offline');
  },
  caches: {
    match: async (request) => {
      looked.push(request);
      return request === origin + '/scenes'
        ? new Response('scenes')
        : undefined;
    },
  },
};
const source = fs.readFileSync('public/sw.js', 'utf8');
assert.ok(source.includes("'" + offlineCache + "'"));
vm.runInNewContext(source, sw);
let result;
handlers.fetch({
  request: {
    url: origin + '/scenes?category=hotel',
    method: 'GET',
    mode: 'navigate',
  },
  respondWith: (p) => (result = p),
});
assert.equal(await (await result).text(), 'scenes');
handlers.fetch({
  request: { url: origin + '/unknown', method: 'GET', mode: 'navigate' },
  respondWith: (p) => (result = p),
});
assert.equal((await result).status, 503);
let intercepted = false;
handlers.fetch({
  request: { url: origin + '/api/speech', method: 'POST' },
  respondWith: () => (intercepted = true),
});
assert.equal(intercepted, false);
console.log(
  'Offline cache: private/API/dev URLs excluded, per-route query fallback, unknown-route failure and POST bypass passed.',
);
