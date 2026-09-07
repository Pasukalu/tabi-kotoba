'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, CalendarDays } from 'lucide-react';
import { useLearning } from '@/lib/learning';
import {
  makeDaily,
  dailyDate,
  advanceDaily,
  completeDailyStep,
  summarizeDaily,
  DailyRun,
  ConversationDraft,
} from '@/lib/daily';
import { scenarios } from '@/lib/dialogue';
import { allEntries } from '@/lib/content';
import { Conversation } from './conversation';
import { Sentence, Choice, Japanese } from './text';
import { Progress } from '@/components/ui/progress';
export default function DailyChallenge() {
  const { progress, setProgress, loaded, mark } = useLearning();
  const [date, setDate] = useState(dailyDate());
  const run: DailyRun | undefined = progress.dailyRuns?.[date];
  useEffect(() => {
    if (!loaded || run) return;
    setProgress((p: any) => ({
      ...p,
      dailyRuns: { ...p.dailyRuns, [date]: makeDaily(date) },
    }));
  }, [loaded, date, !!run, setProgress]);
  const snapshot = useCallback(
    (draft: ConversationDraft) => {
      setProgress((p: any) => {
        const current = p.dailyRuns?.[date];
        if (!current || current.scenes[current.cursor] !== draft.sceneId)
          return p;
        return {
          ...p,
          dailyRuns: { ...p.dailyRuns, [date]: { ...current, draft } },
        };
      });
    },
    [date, setProgress],
  );
  const completed = useCallback(
    (results: any[]) => {
      setProgress((p: any) => {
        const current = p.dailyRuns?.[date];
        if (!current) return p;
        return {
          ...p,
          dailyRuns: {
            ...p.dailyRuns,
            [date]: completeDailyStep(current, results),
          },
        };
      });
    },
    [date, setProgress],
  );
  if (!loaded || !run)
    return (
      <div className="panel" role="status">
        正在读取今日挑战…
      </div>
    );
  const summary = summarizeDaily(run),
    finished = run.cursor === run.scenes.length;
  const active = scenarios.find((s) => s.id === run.scenes[run.cursor]);
  function next() {
    setProgress((p: any) => ({
      ...p,
      dailyRuns: { ...p.dailyRuns, [date]: advanceDaily(p.dailyRuns[date]) },
    }));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">今日の日本生活 · DAILY JOURNEY</span>
          <h1>{run.title}</h1>
          <p>{run.description} 各任务使用独立练习设定。</p>
        </div>
        <Choice
          label="挑战日期"
          value={date}
          onChange={setDate}
          items={[
            ...new Set([dailyDate(), ...Object.keys(progress.dailyRuns || {})]),
          ]
            .sort()
            .reverse()
            .map((d) => [d, d])}
        />
      </div>
      <section className="daily-overview panel">
        <div className="row spaced">
          <span>
            <CalendarDays size={17} /> {run.date}
          </span>
          <b>
            {summary.completed} / {run.scenes.length} 已完成
          </b>
        </div>
        <Progress value={(summary.completed / run.scenes.length) * 100} />
        <ol className="daily-stops">
          {run.scenes.map((id, i) => (
            <li
              key={i}
              className={
                i === run.cursor ? 'current' : run.records[i] ? 'done' : ''
              }
            >
              <span>{run.records[i] ? '✓' : i + 1}</span>
              <b>{scenarios.find((s) => s.id === id)?.title}</b>
            </li>
          ))}
        </ol>
        <p className="muted">
          自动保存已发送对话和输入草稿；离开后仍可从当前步骤继续。录音不会保存到挑战档案。日期只用于生成练习组合。
        </p>
      </section>
      {!finished && active ? (
        <>
          <Conversation
            key={date + '-' + run.cursor}
            initial={active.id}
            draft={run.draft}
            onSnapshot={snapshot}
            onComplete={completed}
            locked
          />
          {run.records[run.cursor] && (
            <div className="daily-next">
              <button className="primary" onClick={next}>
                {run.cursor === run.scenes.length - 1
                  ? '查看整日复盘'
                  : '完成这一站，前往下一站'}
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <section className="daily-summary">
          <div className="panel">
            <Check size={32} />
            <h2>一日、お疲れさまでした。</h2>
            <p>今天完成了 {run.scenes.length} 个真实沟通任务。</p>
            <div className="stats">
              <div className="stat">
                <span>独立回应通过率</span>
                <strong>
                  {summary.total
                    ? Math.round((summary.accepted / summary.total) * 100)
                    : 0}
                  <small>%</small>
                </strong>
              </div>
              <div className="stat">
                <span>回答次数</span>
                <strong>{summary.total}</strong>
              </div>
              <div className="stat">
                <span>超过10秒</span>
                <strong>{summary.slow}</strong>
              </div>
              <div className="stat">
                <span>平均回应</span>
                <strong>
                  {summary.averageSeconds.toFixed(1)}
                  <small>秒</small>
                </strong>
              </div>
            </div>
            <p className="muted">
              数据反映本地情景规则的识别情况。耗时含阅读与思考，不是纯反应速度；不作为
              AI 自然度评分。
            </p>
            <button
              className="primary"
              onClick={() =>
                [
                  ...new Set([...summary.reviewIds, ...summary.rememberIds]),
                ].forEach((id) => mark(id, 'review'))
              }
            >
              把今日重点加入 SRS
            </button>
          </div>
          <div className="section-heading">
            <h2>今日覚えるべき5表現</h2>
          </div>
          {summary.rememberIds.map((id) => {
            const e = allEntries.find((e) => e.id === id);
            return e ? <Sentence key={id} entry={e} /> : null;
          })}
          <div className="section-heading">
            <h2>一整天的复盘</h2>
          </div>
          {run.records.map((r, i) => (
            <details className="panel history" key={i}>
              <summary>
                {i + 1}. {scenarios.find((s) => s.id === r.scene)?.title}
              </summary>
              {r.results.map((x: any, n: number) => (
                <article className="review-item" key={n}>
                  <b>あなた：{x.original}</b>
                  <p>
                    より自然：
                    <Japanese text={x.natural} />
                  </p>
                  <p>{x.why}</p>
                </article>
              ))}
            </details>
          ))}
        </section>
      )}
    </>
  );
}
