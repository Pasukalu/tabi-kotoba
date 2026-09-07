import type { Progress, Settings } from './learning';
const obj = (v: any) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const strings = (v: any) =>
  Array.isArray(v) &&
  v.length <= 20000 &&
  v.every((x) => typeof x === 'string' && x.length <= 3000);
const finite = (v: any) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;
const safeReview = (v: any) =>
  !v ||
  (obj(v) &&
    obj(v.metrics) &&
    Object.values(v.metrics).every((n) => n === null || finite(n)) &&
    Array.isArray(v.items) &&
    v.items.every(
      (x: any) =>
        obj(x) &&
        [
          'original',
          'natural',
          'common',
          'staff',
          'why',
          'written',
          'overpolite',
          'underpolite',
        ].every((k) => typeof x[k] === 'string') &&
        Number.isInteger(x.stars) &&
        x.stars >= 1 &&
        x.stars <= 5,
    ) &&
    Array.isArray(v.remember) &&
    v.remember.every(
      (x: any) =>
        obj(x) &&
        ['japanese', 'chinese', 'explanation'].every(
          (k) => typeof x[k] === 'string',
        ),
    ));
const safeCustom = (v: any) =>
  !v ||
  (obj(v) &&
    ['japanese', 'chinese', 'explanation'].every(
      (k) => typeof v[k] === 'string',
    ) &&
    ['kana', 'romaji'].every(
      (k) => v[k] === undefined || typeof v[k] === 'string',
    ));
const results = (v: any) =>
  Array.isArray(v) &&
  v.length <= 1000 &&
  v.every(
    (x) =>
      obj(x) &&
      [
        'original',
        'natural',
        'common',
        'staff',
        'why',
        'written',
        'overpolite',
        'underpolite',
      ].every((k) => typeof x[k] === 'string') &&
      finite(x.ms) &&
      (x.assisted === undefined || typeof x.assisted === 'boolean') &&
      typeof x.accepted === 'boolean',
  );
export function validateProgress(p: any): Progress {
  if (
    p?.reviews?.some?.((r: any) => !safeReview(r?.aiReview)) ||
    Object.values(p?.dailyRuns || {}).some(
      (r: any) =>
        !safeReview(r?.draft?.aiReview) || !safeCustom(r?.draft?.custom),
    ) ||
    Object.values(p?.conversationDrafts || {}).some(
      (d: any) => !safeReview(d?.aiReview) || !safeCustom(d?.custom),
    )
  )
    throw Error('保存的 AI 复盘或台词格式不正确。');
  if (
    !obj(p) ||
    !['days', 'mastered', 'favorites', 'completed'].every((k) =>
      strings(p[k]),
    ) ||
    !obj(p.srs) ||
    !Array.isArray(p.attempts) ||
    !Array.isArray(p.reviews)
  )
    throw Error('学习记录结构不完整。');
  if (
    Object.keys(p.srs).length > 20000 ||
    Object.values(p.srs).some(
      (s: any) =>
        !obj(s) ||
        !['due', 'interval', 'streak', 'wrong'].every((k) => finite(s[k])) ||
        typeof s.reason !== 'string',
    )
  )
    throw Error('复习计划格式不正确。');
  if (
    p.attempts.length > 50000 ||
    p.attempts.some(
      (x: any) =>
        !obj(x) ||
        typeof x.id !== 'string' ||
        typeof x.correct !== 'boolean' ||
        !finite(x.ms) ||
        !finite(x.at),
    )
  )
    throw Error('答题记录格式不正确。');
  if (
    p.reviews.length > 1000 ||
    p.reviews.some(
      (x: any) =>
        !obj(x) ||
        typeof x.scene !== 'string' ||
        !finite(x.at) ||
        !results(x.results),
    )
  )
    throw Error('会话复盘格式不正确。');
  const extraEntries = p.extraEntries ?? [];
  if (
    !Array.isArray(extraEntries) ||
    extraEntries.length > 20000 ||
    extraEntries.some(
      (e: any) =>
        !obj(e) ||
        ![
          'id',
          'japanese',
          'chinese',
          'explanation',
          'notes',
          'scene',
          'category',
          'jlpt',
          'formality',
          'nativeFrequency',
          'pitfalls',
        ].every((k) => typeof e[k] === 'string') ||
        !finite(e.frequency) ||
        !(e.example === null || typeof e.example === 'string'),
    )
  )
    throw Error('个人词库格式不正确。');
  const machineRuns = p.machineRuns ?? [],
    broadcastRuns = p.broadcastRuns ?? [],
    dailyRuns = p.dailyRuns ?? {};
  if (
    !Array.isArray(machineRuns) ||
    machineRuns.some(
      (r: any) =>
        !obj(r) ||
        !finite(r.at) ||
        !obj(r.booking) ||
        typeof r.booking.train !== 'string' ||
        typeof r.booking.seat !== 'string' ||
        !Array.isArray(r.mistakes) ||
        r.mistakes.some(
          (m: any) =>
            !obj(m) || !finite(m.step) || typeof m.message !== 'string',
        ),
    )
  )
    throw Error('购票练习记录不正确。');
  if (
    !Array.isArray(broadcastRuns) ||
    broadcastRuns.some(
      (r: any) =>
        !obj(r) ||
        !finite(r.at) ||
        !Array.isArray(r.results) ||
        r.results.some(
          (x: any) =>
            !obj(x) ||
            typeof x.id !== 'string' ||
            typeof x.correct !== 'boolean',
        ),
    )
  )
    throw Error('广播练习记录不正确。');
  if (
    !obj(dailyRuns) ||
    Object.values(dailyRuns).some(
      (r: any) =>
        !obj(r) ||
        typeof r.date !== 'string' ||
        typeof r.title !== 'string' ||
        !strings(r.scenes) ||
        r.scenes.length !== 8 ||
        !Number.isInteger(r.cursor) ||
        r.cursor < 0 ||
        r.cursor > r.scenes.length ||
        !Array.isArray(r.records) ||
        r.records.some(
          (x: any) =>
            !obj(x) || typeof x.scene !== 'string' || !results(x.results),
        ) ||
        !finite(r.startedAt) ||
        !(r.finishedAt === null || finite(r.finishedAt)) ||
        (r.draft !== null &&
          (!obj(r.draft) ||
            typeof r.draft.input !== 'string' ||
            !Array.isArray(r.draft.history) ||
            r.draft.history.some(
              (h: any) =>
                !obj(h) ||
                typeof h.text !== 'string' ||
                typeof h.role !== 'string',
            ) ||
            !results(r.draft.results) ||
            !Number.isInteger(r.draft.index) ||
            r.draft.index < 0)),
    )
  )
    throw Error('每日挑战记录不正确。');
  const conversationDrafts = p.conversationDrafts ?? {};
  if (
    !obj(conversationDrafts) ||
    Object.values(conversationDrafts).some(
      (d: any) =>
        !obj(d) ||
        typeof d.sceneId !== 'string' ||
        typeof d.input !== 'string' ||
        (d.assisted !== undefined && typeof d.assisted !== 'boolean') ||
        !Number.isInteger(d.index) ||
        d.index < 0 ||
        !results(d.results) ||
        !Array.isArray(d.history) ||
        d.history.some(
          (h: any) =>
            !obj(h) || typeof h.role !== 'string' || typeof h.text !== 'string',
        ),
    )
  )
    throw Error('对话草稿格式不正确。');
  // Reconstruct the top-level object, excluding accidental or obsolete fields.
  const reviewSession = p.reviewSession ?? null;
  if (
    reviewSession !== null &&
    (!obj(reviewSession) ||
      !strings(reviewSession.ids) ||
      reviewSession.ids.length > 100 ||
      new Set(reviewSession.ids).size !== reviewSession.ids.length ||
      !Number.isInteger(reviewSession.cursor) ||
      reviewSession.cursor < 0 ||
      reviewSession.cursor > reviewSession.ids.length ||
      !Number.isInteger(reviewSession.correct) ||
      reviewSession.correct < 0 ||
      reviewSession.correct > reviewSession.cursor ||
      typeof reviewSession.paused !== 'boolean' ||
      (reviewSession.mode !== undefined &&
        !['listening', 'reading', 'production'].includes(reviewSession.mode)) ||
      !finite(reviewSession.startedAt))
  )
    throw Error('复习进度格式不正确。');
  const surpriseRun = p.surpriseRun ?? null;
  if (
    surpriseRun !== null &&
    (!obj(surpriseRun) ||
      typeof surpriseRun.taskId !== 'string' ||
      surpriseRun.taskId.length > 100 ||
      !finite(surpriseRun.startedAt))
  )
    throw Error('突发实战记录不正确。');
  return {
    reviewSession,
    surpriseRun,
    conversationDrafts,
    days: p.days,
    mastered: p.mastered,
    favorites: p.favorites,
    completed: p.completed,
    srs: p.srs,
    attempts: p.attempts,
    reviews: p.reviews,
    extraEntries,
    machineRuns,
    broadcastRuns,
    dailyRuns,
  };
}
export function normalizeSettings(s: any): Settings {
  const pick = (value: any, list: any[], fallback: any) =>
    list.includes(value) ? value : fallback;
  const clamp = (v: any, min: number, max: number, fallback: number) =>
    Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  return {
    voiceName:
      typeof s?.voiceName === 'string' ? s.voiceName.slice(0, 200) : '',
    mode: pick(
      s?.mode,
      ['native', 'ruby', 'kana', 'romaji', 'zh', 'explain', 'hidden'],
      'ruby',
    ),
    speed: pick(s?.speed, [0.7, 0.85, 1, 1.15], 1),
    level: pick(
      s?.level,
      ['N5', 'N4', 'N3', 'N2', 'N1', '日本生活', 'Native Challenge'],
      'N2',
    ),
    dark: s?.dark === true,
    font: clamp(s?.font, 16, 24, 16),
    ruby: clamp(s?.ruby, 0.45, 0.8, 0.53),
    audioProvider: pick(s?.audioProvider, ['browser', 'cloud'], 'browser'),
    ai: s?.ai === true,
  };
}
export function parseBackup(raw: string) {
  if (raw.length > 8_000_000)
    throw Error('备份过大，请使用本站导出的学习记录。');
  const data = JSON.parse(raw);
  if (data?.version !== 1) throw Error('不支持的备份版本。');
  return {
    progress: validateProgress(data.progress),
    settings: normalizeSettings(data.settings),
  };
}
