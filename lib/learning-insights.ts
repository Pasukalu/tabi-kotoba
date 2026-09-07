import type { Entry } from './content';
import type { Progress } from './learning';
type Scenario = { id: string; category: string; title: string };
export function learningInsights(
  progress: Progress,
  entries: Entry[],
  scenarios: Scenario[],
  now: number,
) {
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const knownScenarios = new Set(scenarios.map((scene) => scene.id));
  const completed = new Set(
    progress.completed.filter((id) => knownScenarios.has(id)),
  );
  const latest = new Map<string, Progress['attempts'][number]>();
  for (const attempt of progress.attempts) {
    if (!entryMap.has(attempt.id)) continue;
    if (!latest.has(attempt.id) || latest.get(attempt.id)!.at <= attempt.at)
      latest.set(attempt.id, attempt);
  }
  const weak = [...latest.values()]
    .filter(
      (attempt) => !attempt.correct || attempt.assisted || attempt.ms > 10000,
    )
    .sort((a, b) => b.at - a.at)
    .map((attempt) => ({
      entry: entryMap.get(attempt.id)!,
      reason: !attempt.correct
        ? '未答对'
        : attempt.assisted
          ? '使用过提示'
          : '反应较慢',
    }));
  const due = Object.entries(progress.srs).filter(
    ([id, item]) => entryMap.has(id) && item.due <= now,
  );
  const categories = [...new Set(scenarios.map((scene) => scene.category))].map(
    (category) => {
      const list = scenarios.filter((scene) => scene.category === category);
      const finished = list.filter((scene) => completed.has(scene.id)).length;
      const trouble = weak.filter(
        (item) => item.entry.scene === category,
      ).length;
      return {
        category,
        finished,
        total: list.length,
        coverage: Math.round((finished / list.length) * 100),
        trouble,
        next: list.find((scene) => !completed.has(scene.id)) || list[0],
      };
    },
  );
  const recommended = [...categories].sort(
    (a, b) => b.trouble - a.trouble || a.coverage - b.coverage,
  )[0];
  return {
    completed: completed.size,
    coverage: scenarios.length
      ? Math.round((completed.size / scenarios.length) * 100)
      : 0,
    weak: weak.slice(0, 5),
    due: due.length,
    categories,
    recommended,
  };
}
