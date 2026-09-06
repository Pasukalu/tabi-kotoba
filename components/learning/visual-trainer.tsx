'use client';
import { useStopwatch } from '@/lib/use-stopwatch';
import { useState } from 'react';
import tasks from '@/data/visual-tasks.json';
import { useLearning, useAudio } from '@/lib/learning';
import { Choice, Japanese } from './text';
export default function VisualTrainer({ category }: { category?: string }) {
  const available = tasks.filter((t) => !category || t.category === category);
  const pool = available.length ? available : tasks;
  const [id, setId] = useState(pool[0].id),
    [step, setStep] = useState(0),
    [help, setHelp] = useState(false),
    [assisted, setAssisted] = useState(false),
    [error, setError] = useState(''),
    [mistakes, setMistakes] = useState(0),
    [done, setDone] = useState(false);
  const { settings, answer } = useLearning(),
    audio = useAudio(),
    timer = useStopwatch();
  const task = pool.find((t) => t.id === id) || pool[0],
    current = task.steps[Math.min(step, task.steps.length - 1)],
    native = settings.level === 'Native Challenge';
  function reset(next: string) {
    audio.stop();
    setId(next);
    setStep(0);
    setHelp(false);
    setAssisted(false);
    setError('');
    setMistakes(0);
    setDone(false);
    timer.reset();
  }
  function choose(index: number) {
    const correct = index === current.correct;
    answer(current.entryId, correct, timer.elapsed(), { assisted });
    if (!correct) {
      setMistakes((m) => m + 1);
      setError(
        native
          ? '✗ もう[一度|いちど]、[表示|ひょうじ]を[確認|かくにん]してください。'
          : '✗ 再确认屏幕文字与任务要求。',
      );
      return;
    }
    setError('');
    setHelp(false);
    setAssisted(false);
    if (step === task.steps.length - 1) setDone(true);
    else setStep(step + 1);
    timer.reset();
  }
  return (
    <div className="visual-practice">
      <div className="filter-bar">
        <Choice
          label="实景阅读任务"
          value={task.id}
          onChange={reset}
          items={pool.map((t) => [t.id, t.title])}
        />
      </div>
      <section className="task-brief">
        <span className="tag">実景リーディング</span>
        <h2>{task.title}</h2>
        <p>
          {native ? (
            <Japanese text={task.taskJapanese} mode="native" />
          ) : (
            task.task
          )}
        </p>
        <small>原创仿真界面。不会产生真实购买、预约或付款。</small>
      </section>
      <section className={'visual-machine visual-' + task.category}>
        <header>
          <span>旅 / TRAINING</span>
          <b>{done ? '✓' : `${step + 1} / ${task.steps.length}`}</b>
        </header>
        {done ? (
          <div className="machine-complete">
            <h2>✓ 操作完成</h2>
            <p>
              完成 {task.steps.length} 步，共调整 {mistakes}{' '}
              次。错误与借助提示的内容已纳入复习计划。
            </p>
            <div className="row">
              <button className="primary" onClick={() => reset(task.id)}>
                再练一次
              </button>
              <a href="/review" className="secondary">
                复习本次表达
              </a>
            </div>
          </div>
        ) : (
          <>
            <h2>
              <Japanese
                text={current.heading}
                mode={native ? 'native' : 'ruby'}
              />
            </h2>
            <div className="visual-notice">
              <Japanese
                text={current.notice}
                mode={native ? 'native' : 'ruby'}
              />
              <button
                className="icon-btn"
                aria-label="听屏幕说明"
                onClick={() => audio.play(current.notice)}
              >
                🔊
              </button>
            </div>
            <div className="visual-options">
              {current.options.map((o, i) => (
                <div key={i}>
                  <button className="visual-option" onClick={() => choose(i)}>
                    <Japanese
                      text={o.japanese}
                      mode={native ? 'native' : 'ruby'}
                    />
                  </button>
                  {help && <p>{o.chinese}</p>}
                </div>
              ))}
            </div>
            {error && (
              <p className="feedback" role="alert">
                {native ? <Japanese text={error} mode="native" /> : error}
              </p>
            )}
            {!native && (
              <div className="visual-help">
                <button
                  className="secondary"
                  onClick={() => {
                    setHelp(!help);
                    setAssisted(true);
                  }}
                >
                  {help ? '收起辅助' : '查看本步目标与词义'}
                </button>
                {help && <p>{current.goal}</p>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
