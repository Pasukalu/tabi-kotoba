'use client';
import { learningInsights } from '@/lib/learning-insights';
import { useLearning } from '@/lib/learning';
import { useClock } from '@/lib/use-clock';
import { scenarios } from '@/lib/dialogue';
import { names } from '@/lib/content';
import { Sentence } from './text';
export default function NextPractice() {
  const { progress, entries } = useLearning();
  const now = useClock();
  const insights = learningInsights(progress, entries, scenarios, now);
  const next = insights.recommended;
  return (
    <section className="panel">
      <h2>下一步，练什么？</h2>
      {insights.due > 0 && (
        <p>
          <a className="text-link" href="/review">
            先复习 {insights.due} 条到期内容 →
          </a>
        </p>
      )}
      {next && (
        <>
          <p>
            {next.trouble
              ? `${names[next.category]}最近有 ${next.trouble} 条表达需要巩固。`
              : `${names[next.category]}已完成 ${next.finished} / ${next.total} 个流程。`}
          </p>
          <a className="primary" href={'/conversation?scene=' + next.next.id}>
            {next.next.title} →
          </a>
        </>
      )}
      <h3>最近需要巩固的表达</h3>
      {insights.weak.length ? (
        insights.weak.map(({ entry, reason }) => (
          <div key={entry.id}>
            <p className="muted">
              {reason} · {names[entry.scene] || entry.scene}
            </p>
            <Sentence entry={entry} />
          </div>
        ))
      ) : (
        <p className="muted">
          暂时没有需要巩固的近期记录。完成一次训练后，这里会根据你的实际表现推荐。
        </p>
      )}
    </section>
  );
}
