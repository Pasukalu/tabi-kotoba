import { allEntries, plain, type Entry } from './content';
import { reviewExpressions } from './review-expressions';
export type FocusResult = {
  natural: string;
  goal?: string;
  accepted: boolean;
  ms: number;
};
export function sessionFocus(results: FocusResult[], scene: string): Entry[] {
  const seen = new Set<string>();
  const prioritized = [...results].sort(
    (a, b) =>
      Number(b.accepted === false) - Number(a.accepted === false) ||
      Number(b.ms > 10000) - Number(a.ms > 10000),
  );
  const selected: Entry[] = [];
  for (const result of prioritized) {
    const text = plain(result.natural);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    const existing = allEntries.find((entry) => plain(entry.japanese) === text);
    const entry =
      existing ||
      reviewExpressions(
        [
          {
            japanese: result.natural,
            chinese: result.goal || '本场景的回应表达',
            explanation:
              '[場面|ばめん]に[合|あ]わせて[使|つか]う、[返答|へんとう]の[一例|いちれい]です。',
          },
        ],
        scene,
      )[0];
    selected.push(
      existing || {
        ...entry,
        id: entry.id.replace('personal-', 'course-'),
        nativeFrequency: '课程回应示例；非频率统计',
        notes: '来自课程中的参考回应。优先复习本轮未完成或反应慢的沟通目标。',
        pitfalls:
          '参考回应不是唯一正确答案，离线模式不判断自由表达的全部自然度。',
      },
    );
    if (selected.length === 5) break;
  }
  return selected;
}
