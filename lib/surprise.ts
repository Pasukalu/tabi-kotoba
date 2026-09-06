import deck from '@/data/surprise-deck.json';
export { deck as surpriseTasks };
export type SurpriseRun = { taskId: string; startedAt: number };
export function chooseSurprise(
  category: string,
  previous: string | undefined,
  random = Math.random,
  now = Date.now,
): SurpriseRun | null {
  const matching = deck.filter(
    (task) => category === 'all' || task.category === category,
  );
  const remaining = matching.filter((task) => task.id !== previous);
  const pool = remaining.length ? remaining : matching;
  if (!pool.length) return null;
  const value = Math.max(0, Math.min(0.999999, random()));
  return { taskId: pool[Math.floor(value * pool.length)].id, startedAt: now() };
}
export function surpriseDraftKey(run: SurpriseRun) {
  return 'surprise:' + run.taskId + ':' + run.startedAt;
}
