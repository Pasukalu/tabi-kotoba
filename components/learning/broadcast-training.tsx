'use client';
import { useState, useRef, useEffect } from 'react';
import { Volume2, ArrowRight, Headphones } from 'lucide-react';
import tasks from '@/data/broadcast-tasks.json';
import { allEntries } from '@/lib/content';
import { useLearning, useAudio } from '@/lib/learning';
import { Japanese, Sentence, Choice } from './text';
export default function BroadcastTraining() {
  const { settings, setSettings, answer, setProgress } = useLearning(),
    audio = useAudio();
  const [i, setI] = useState(0),
    [selected, setSelected] = useState<number | null>(null),
    [show, setShow] = useState(false),
    [assisted, setAssisted] = useState(false),
    [heard, setHeard] = useState(false),
    [playing, setPlaying] = useState(false),
    [results, setResults] = useState<any[]>([]),
    [finished, setFinished] = useState(false);
  const timer = useRef(0),
    generation = useRef(0);
  const q = tasks[i],
    entry = allEntries.find((e) => e.id === q.entryId)!,
    native = settings.level === 'Native Challenge';
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function listen() {
    const id = ++generation.current;
    setPlaying(true);
    setHeard(false);
    const completed = await audio.play(entry.japanese);
    if (id !== generation.current) return;
    setPlaying(false);
    if (completed) {
      setHeard(true);
      timer.current = performance.now();
    }
  }
  function stop() {
    generation.current++;
    audio.stop();
    setPlaying(false);
    setHeard(false);
  }
  function choose(n: number) {
    if (selected !== null || !heard || playing) return;
    const ms = Math.max(0, performance.now() - timer.current),
      correct = n === q.correct;
    const result = { id: q.entryId, correct, assisted, ms };
    setSelected(n);
    setResults((r) => [...r, result]);
    answer(q.entryId, correct, ms, { assisted });
  }
  function next() {
    stop();
    if (i === tasks.length - 1) {
      setFinished(true);
      setProgress((p: any) => ({
        ...p,
        broadcastRuns: [
          { at: Date.now(), results },
          ...(p.broadcastRuns || []),
        ].slice(0, 30),
      }));
      return;
    }
    setI(i + 1);
    setSelected(null);
    setShow(false);
    setAssisted(false);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">聞き取り → 行動</span>
          <h1>放送を聞いて、次の一歩へ。</h1>
          <p>原创仿真广播，不是实时车站信息。先听完整，再做决定。</p>
        </div>
        <a className="secondary" href="/listening">
          店员听力
        </a>
      </div>
      {finished ? (
        <section className="panel broadcast-finish">
          <Headphones size={35} />
          <h2>本组广播实战完成</h2>
          <div className="stats">
            <div className="stat">
              <span>独立听懂</span>
              <strong>
                {results.filter((r) => r.correct && !r.assisted).length}
                <small>/{tasks.length}</small>
              </strong>
            </div>
            <div className="stat">
              <span>看稿辅助</span>
              <strong>{results.filter((r) => r.assisted).length}</strong>
            </div>
            <div className="stat">
              <span>行动误判</span>
              <strong>{results.filter((r) => !r.correct).length}</strong>
            </div>
          </div>
          <p className="muted">
            错误和辅助作答的表达已进入复习。反应时间从本次广播完整播放结束起计算。
          </p>
          {results.map((r, n) => (
            <details className="panel history" key={r.id}>
              <summary>
                {r.correct ? '✓' : '✗'} {tasks[n].goal}
                {r.assisted ? ' · 辅助练习' : ''}
              </summary>
              <p>{tasks[n].why}</p>
              <Sentence entry={allEntries.find((e) => e.id === r.id)!} />
            </details>
          ))}
          <button
            className="primary"
            onClick={() => {
              setI(0);
              setSelected(null);
              setShow(false);
              setAssisted(false);
              setResults([]);
              setFinished(false);
            }}
          >
            再练一轮
          </button>
        </section>
      ) : (
        <div className="broadcast-layout">
          <section className="panel broadcast-stage">
            <div className="row spaced">
              <span className="tag">
                駅の放送 · {i + 1}/{tasks.length}
              </span>
              <Choice
                label="广播语速"
                value={String(native ? 1.15 : settings.speed)}
                onChange={(v) => setSettings({ ...settings, speed: Number(v) })}
                items={(native ? ['1.15'] : ['0.7', '0.85', '1', '1.15']).map(
                  (x) => [x, x + '×'],
                )}
              />
            </div>
            <h2>
              {native ? <Japanese text={q.question} mode="native" /> : q.goal}
            </h2>
            <button
              className="listen-circle"
              aria-label="播放完整广播"
              onClick={listen}
              disabled={playing || selected !== null}
            >
              <Volume2 size={38} />
            </button>
            <p className="center muted" role="status">
              {playing
                ? '播放中；请听完再选择行动。'
                : heard
                  ? '播放完成，现在请选择。'
                  : '点按播放。若语音不可用，不会开始答题。'}
            </p>
            <div className="row centered">
              <button
                className="secondary"
                onClick={audio.pause}
                disabled={!playing}
              >
                暂停
              </button>
              <button
                className="secondary"
                onClick={audio.resume}
                disabled={!playing}
              >
                继续
              </button>
              <button className="secondary" onClick={stop} disabled={!playing}>
                停止
              </button>
              {!native && (
                <button
                  className="secondary"
                  onClick={() => {
                    setShow(!show);
                    if (selected === null) setAssisted(true);
                  }}
                >
                  {show ? '隐藏文字稿' : '查看文字稿（辅助）'}
                </button>
              )}
            </div>
            {show && <Sentence key={entry.id} entry={entry} compact />}
            <div className="answers">
              {q.choices.map((choice, n) => (
                <button
                  key={n}
                  className={
                    'answer ' +
                    (selected === n
                      ? selected === q.correct
                        ? 'correct'
                        : 'incorrect'
                      : '')
                  }
                  disabled={!heard || playing || selected !== null}
                  onClick={() => choose(n)}
                >
                  <span>{String.fromCharCode(65 + n)}</span>
                  <div>
                    <Japanese
                      text={choice.japanese}
                      mode={native ? 'native' : 'ruby'}
                    />
                    {!native && <small>{choice.chinese}</small>}
                  </div>
                  {selected === n && (selected === q.correct ? '✓' : '✗')}
                </button>
              ))}
            </div>
            {selected !== null && (
              <div className="feedback" role="status">
                <b>
                  {selected === q.correct
                    ? '✓ 行动判断正确'
                    : '✗ 再抓一次关键信息'}
                  {assisted ? ' · 本题看过文字稿' : ''}
                </b>
                <p>{q.why}</p>
                <button className="primary" onClick={next}>
                  {i === tasks.length - 1 ? '查看本组复盘' : '下一条广播'}
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </section>
          <aside className="panel">
            <h3>听的是信息，也要判断行动。</h3>
            <p>站台编号、停运、终点、回送、开门方向、晚点和安全提示。</p>
            <p className="muted">
              Native Challenge
              只显示日语任务与选项，隐藏文字稿；本组完成后可查看中文复盘。
            </p>
            <p className="muted">
              播放使用已选择的日语语音来源。设备没有日语声音时，请到设置添加或切换服务。
            </p>
            <a className="text-link" href="/profile">
              打开声音设置 →
            </a>
          </aside>
        </div>
      )}
    </>
  );
}
