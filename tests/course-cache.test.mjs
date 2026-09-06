import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '../node_modules/typescript/lib/typescript.js';
function load(
  file,
  require = () => {
    throw Error('Unexpected dependency');
  },
) {
  const context = {
    exports: {},
    require,
    Blob,
    Date,
    setTimeout,
    clearTimeout,
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
const content = load('lib/content.ts', (p) =>
  JSON.parse(fs.readFileSync(p.replace('@/', ''))),
);
const { filterCourse } = load('lib/course-filter.ts', () => content);
const scenes = JSON.parse(fs.readFileSync('data/scenarios.json'));
const hotel = content.lessons.hotel;
assert.ok(
  filterCourse(hotel, 'hotel-checkin', '', scenes).some(
    (e) => e.id === 'hotel-welcome',
  ),
);
assert.ok(filterCourse(hotel, 'all', '退房', scenes).length);
assert.ok(filterCourse(hotel, 'all', 'YOYAKU', scenes).length);
assert.ok(filterCourse(hotel, 'all', 'よやく', scenes).length);
assert.ok(
  filterCourse(hotel, 'staff', '', scenes).every(
    (e) => e.formality === '店員側',
  ),
);
assert.ok(
  filterCourse(hotel, 'reply', '', scenes).every(
    (e) => e.formality !== '店員側',
  ),
);
assert.equal(
  filterCourse(hotel, 'hotel-checkin', 'not-a-match', scenes).length,
  0,
);
const cache = load('lib/audio-cache.ts');
const blob = new Blob(['audio'], { type: 'audio/mpeg' }),
  now = Date.now();
const clip = { key: 'test', blob, bytes: blob.size, createdAt: now };
assert.equal(cache.validClip(clip, now), true);
assert.equal(cache.validClip({ ...clip, bytes: 100 }, now), false);
assert.equal(cache.validClip(clip, now - 1), false);
assert.equal(cache.validClip(clip, now + 31 * 86400000), false);
assert.equal(await cache.readAudioClip('none'), null);
await cache.saveAudioClip('none', blob);
assert.equal(await cache.clearAudioClips(), false);
console.log(
  'Course filters: canonical NPC references and multilingual search; audio cache: expiration, corruption and unavailable-storage fallback passed.',
);
