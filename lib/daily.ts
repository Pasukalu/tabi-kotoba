import plans from '@/data/daily-plans.json';
export type ConversationDraft = {
  assisted?: boolean;
  runId?: string;
  sceneId: string;
  index: number;
  input: string;
  history: any[];
  results: any[];
  done: boolean;
  custom: any;
  aiReview: any;
};
export type DailyRun = {
  date: string;
  planId: string;
  title: string;
  description: string;
  scenes: string[];
  cursor: number;
  draft: ConversationDraft | null;
  records: { scene: string; results: any[]; at: number }[];
  startedAt: number;
  finishedAt: number | null;
};
export function dailyDate(date = new Date()) {
  return date.toLocaleDateString('sv-SE');
}
export function makeDaily(date: string, now = Date.now()): DailyRun {
  let seed = 2166136261;
  for (const ch of date)
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const plan = plans[Math.floor(random() * plans.length)];
  const scenes = plan.stops.map((s) => s[Math.floor(random() * s.length)]);
  return {
    date,
    planId: plan.id,
    title: plan.title,
    description: plan.description,
    scenes,
    cursor: 0,
    draft: null,
    records: [],
    startedAt: now,
    finishedAt: null,
  };
}
export function completeDailyStep(
  run: DailyRun,
  results: any[],
  now = Date.now(),
): DailyRun {
  if (run.cursor >= run.scenes.length) return run;
  const records = [...run.records];
  records[run.cursor] = { scene: run.scenes[run.cursor], results, at: now };
  return { ...run, records };
}
export function advanceDaily(run: DailyRun, now = Date.now()): DailyRun {
  if (!run.records[run.cursor] || run.cursor >= run.scenes.length) return run;
  const cursor = run.cursor + 1;
  return {
    ...run,
    cursor,
    draft: null,
    finishedAt: cursor === run.scenes.length ? now : null,
  };
}
export function summarizeDaily(run: DailyRun) {
  const results = run.records.flatMap((r) => r.results);
  const total = results.length;
  return {
    completed: run.records.length,
    total,
    accepted: results.filter((r) => r.accepted && !r.assisted).length,
    slow: results.filter((r) => r.ms > 10000).length,
    averageSeconds: total
      ? results.reduce((s, r) => s + (Number.isFinite(r.ms) ? r.ms : 0), 0) /
        total /
        1000
      : 0,
    reviewIds: [
      ...new Set(
        results
          .filter((r) => !r.accepted || r.assisted || r.ms > 10000)
          .map((r) => r.entryId)
          .filter(Boolean),
      ),
    ] as string[],
    rememberIds: [
      ...new Set(results.map((r) => r.entryId).filter(Boolean)),
    ].slice(0, 5) as string[],
  };
}
