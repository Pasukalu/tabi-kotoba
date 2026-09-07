'use client';
import { useStopwatch } from '@/lib/use-stopwatch';
import { useState, useRef, useEffect } from 'react';
import { appendTurn } from '@/lib/transcript';
import { difficulty } from '@/lib/difficulty';
import { reviewExpressions } from '@/lib/review-expressions';
import { sessionFocus } from '@/lib/session-focus';
import type { Progress } from '@/lib/learning';
import { useCapabilities } from './service-status';
import type { ConversationDraft } from '@/lib/daily';
import { Mic, Send, Volume2, RotateCcw } from 'lucide-react';
import { useLearning, useAudio } from '@/lib/learning';
import { scenarios, npcEntry, assessLocal, acceptsLocal } from '@/lib/dialogue';
import { plain, allEntries } from '@/lib/content';
import { Sentence, Japanese, Choice } from './text';
export function Conversation({
  initial = 'hotel-checkin',
  draft,
  onSnapshot,
  onComplete,
  locked = false,
  challengeBrief,
}: {
  initial?: string;
  draft?: ConversationDraft | null;
  onSnapshot?: (draft: ConversationDraft) => void;
  onComplete?: (results: any[]) => void;
  locked?: boolean;
  challengeBrief?: string;
}) {
  const { settings, setSettings, setProgress, mark, setNotice } = useLearning(),
    audio = useAudio();
  const capabilities = useCapabilities();
  const activeAI = settings.ai && capabilities.conversation;
  const pendingRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const runId = useRef(draft?.runId || '');
  useEffect(() => {
    if (!runId.current) runId.current = crypto.randomUUID();
  }, []);
  const [sceneId, setSceneId] = useState(initial),
    [assisted, setAssisted] = useState(!!draft?.assisted),
    [index, setIndex] = useState(draft?.index || 0),
    [input, setInput] = useState(draft?.input || ''),
    [history, setHistory] = useState<any[]>(draft?.history || []),
    [results, setResults] = useState<any[]>(draft?.results || []),
    [done, setDone] = useState(draft?.done || false),
    [busy, setBusy] = useState(false),
    [custom, setCustom] = useState<any>(draft?.custom || null),
    [recording, setRecording] = useState(false),
    [recordUrl, setRecordUrl] = useState(''),
    [aiReview, setAiReview] = useState<any>(draft?.aiReview || null);
  const start = useStopwatch(),
    rec = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    held = useRef(false),
    recordUrlRef = useRef('');
  const scene = scenarios.find((s) => s.id === sceneId) || scenarios[0];
  const step = scene.steps[Math.min(index, scene.steps.length - 1)];
  const npc = custom || npcEntry(step.npc);
  const native = settings.level === 'Native Challenge';
  function reset(id: string) {
    runId.current = crypto.randomUUID();
    requestVersion.current++;
    pendingRequest.current?.abort();
    setBusy(false);
    audio.stop();
    setSceneId(id);
    setAssisted(false);
    setIndex(0);
    setInput('');
    setHistory([]);
    setResults([]);
    setDone(false);
    setCustom(null);
    setAiReview(null);
    start.reset();
  }
  const initialRef = useRef(initial);
  useEffect(() => {
    if (initialRef.current !== initial) {
      initialRef.current = initial;
      reset(initial);
    }
  }, [initial]);
  useEffect(() => {
    onSnapshot?.({
      runId: runId.current,
      sceneId,
      index,
      input,
      history,
      results,
      assisted,
      done,
      custom,
      aiReview,
    });
  }, [
    sceneId,
    index,
    input,
    history,
    results,
    assisted,
    done,
    custom,
    aiReview,
    onSnapshot,
  ]);
  useEffect(() => {
    start.reset();
  }, [index]);
  useEffect(
    () => () => {
      requestVersion.current++;
      pendingRequest.current?.abort();
      held.current = false;
      if (rec.current?.state === 'recording') rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (recordUrlRef.current) URL.revokeObjectURL(recordUrlRef.current);
    },
    [],
  );
  async function recordStart() {
    if (recording || held.current) return;
    held.current = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw Error('当前环境不支持录音，请使用 HTTPS 或本机浏览器。');
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!held.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const recorder = new MediaRecorder(s);
      rec.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        if (recordUrlRef.current) URL.revokeObjectURL(recordUrlRef.current);
        const url = URL.createObjectURL(
          new Blob(chunks, { type: recorder.mimeType }),
        );
        recordUrlRef.current = url;
        setRecordUrl(url);
        s.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
    } catch (e: any) {
      held.current = false;
      setNotice(e.message);
    }
  }
  function recordStop() {
    held.current = false;
    if (rec.current?.state === 'recording') rec.current.stop();
    setRecording(false);
  }
  async function submit() {
    if (!input.trim() || busy) return;
    if (settings.ai && !capabilities.conversation) {
      setNotice(
        capabilities.loaded
          ? 'AI 尚未配置。请明确切换到离线模拟后继续。'
          : '正在检查 AI 配置，请稍候。',
      );
      return;
    }
    const original = input.trim(),
      ms = start.elapsed();
    let accepted = acceptsLocal(original, step);
    const repeat = /もう一度|もういちど|聞き取れ|聞こえ|ゆっくり/.test(
      original,
    );
    if (repeat) {
      const rate = /ゆっくり/.test(original) ? 0.85 : settings.speed;
      if (rate !== settings.speed) setSettings({ ...settings, speed: rate });
      audio.play(npc.japanese, false, rate);
      setHistory((h) => [
        ...appendTurn(h, npc.japanese, original),
        { role: 'staff', text: npc.japanese },
      ]);
      setInput('');
      start.reset();
      return;
    }
    let ai: any = null;
    const nextHistory = appendTurn(history, npc.japanese, original);
    if (activeAI) {
      const version = ++requestVersion.current;
      pendingRequest.current?.abort();
      pendingRequest.current = new AbortController();
      setBusy(true);
      try {
        const r = await fetch('/api/conversation', {
          method: 'POST',
          signal: pendingRequest.current!.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: { ...scene, currentStep: index, level: settings.level },
            messages: nextHistory.map((h) => ({
              role: h.role === 'user' ? 'user' : 'assistant',
              content: plain(h.text),
            })),
          }),
        });
        const data: any = await r.json();
        if (version !== requestVersion.current) return;
        if (!r.ok) throw Error(data.error);
        ai = data;
        accepted = ai.advance;
        setCustom({
          ...npcEntry(ai.japanese),
          chinese: ai.chinese || '',
          explanation: ai.explanation || '',
        });
      } catch (e: any) {
        if (version !== requestVersion.current) return;
        setNotice(e.message);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setHistory(nextHistory);
    setInput('');
    const result = {
      ...assessLocal(original, step.reply, accepted, ms),
      assisted,
      entryId:
        allEntries.find((e) => e.id === step.npc)?.id ||
        allEntries.find((e) => e.id === scene.id + '-step-' + index)?.id,
      goal: step.goal,
    };
    const nextResults = [...results, result];
    setResults(nextResults);
    if (!accepted) {
      if (!ai)
        setCustom(
          npcEntry(
            '[恐|おそ]れ[入|い]ります。もう[一度|いちど]お[願|ねが]いできますか。',
          ),
        );
      start.reset();
      return;
    }
    setCustom(
      ai
        ? {
            ...npcEntry(ai.japanese),
            chinese: ai.chinese || '',
            explanation: ai.explanation || '',
          }
        : null,
    );
    if (index === scene.steps.length - 1) {
      setDone(true);
      audio.stop();
      onComplete?.(nextResults);
      const focus = sessionFocus(nextResults, scene.category);
      setProgress((p: Progress) => ({
        ...p,
        extraEntries: [
          ...p.extraEntries.filter(
            (entry) => !focus.some((f) => f.id === entry.id),
          ),
          ...focus.filter(
            (entry) => !allEntries.some((e) => e.id === entry.id),
          ),
        ],
        srs: {
          ...p.srs,
          ...Object.fromEntries(
            focus.map((entry) => [
              entry.id,
              p.srs[entry.id] || {
                due: Date.now(),
                interval: 0,
                streak: 0,
                wrong: 0,
                reason: '会话复盘重点',
              },
            ]),
          ),
        },
        days: [...new Set([...p.days, new Date().toLocaleDateString('sv-SE')])],
        completed: [...new Set([...p.completed, scene.id])],
        reviews: [
          {
            id: runId.current,
            scene: scene.id,
            at: Date.now(),
            results: nextResults,
          },
          ...p.reviews,
        ].slice(0, 30),
      }));
      nextResults
        .filter((x) => x.entryId && (!x.accepted || x.assisted || x.ms > 10000))
        .forEach((x) => mark(x.entryId, 'review'));
    } else {
      setAssisted(false);
      setIndex(index + 1);
    }
  }
  async function reviewAI() {
    if (busy || aiReview) return;
    const version = ++requestVersion.current;
    pendingRequest.current?.abort();
    pendingRequest.current = new AbortController();
    setBusy(true);
    try {
      const r = await fetch('/api/conversation', {
        method: 'POST',
        signal: pendingRequest.current!.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: true,
          scenario: { ...scene, responseTimes: results.map((x) => x.ms) },
          messages: history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: plain(h.text),
          })),
        }),
      });
      const d: any = await r.json();
      if (version !== requestVersion.current) return;
      if (!r.ok) throw Error(d.error);
      const remembered = reviewExpressions(d.remember, scene.category);
      setProgress((p: any) => ({
        ...p,
        extraEntries: [
          ...p.extraEntries.filter(
            (e: any) => !remembered.some((x) => x.id === e.id),
          ),
          ...remembered,
        ],
        srs: {
          ...p.srs,
          ...Object.fromEntries(
            remembered.map((e) => [
              e.id,
              {
                due: Date.now(),
                interval: 0,
                streak: 0,
                wrong: 0,
                reason: 'AI 复盘重点',
              },
            ]),
          ),
        },
      }));
      setAiReview(d);
      setProgress((p: any) => {
        const target = p.reviews.findIndex(
          (r: any) =>
            r.id === runId.current ||
            (!r.id &&
              r.scene === scene.id &&
              JSON.stringify(r.results) === JSON.stringify(results)),
        );
        return {
          ...p,
          reviews: p.reviews.map((r: any, i: number) =>
            i === target ? { ...r, aiReview: d } : r,
          ),
        };
      });
    } catch (e: any) {
      if (version !== requestVersion.current) return;
      setNotice(e.message);
    }
    setBusy(false);
  }
  const remembered = sessionFocus(results, scene.category);
  return (
    <div className="conversation-layout">
      <div>
        <div className="row spaced">
          {locked ? (
            <b>{challengeBrief && !done ? '突发实战' : scene.title}</b>
          ) : (
            <Choice
              label="选择对话场景"
              value={sceneId}
              onChange={reset}
              items={scenarios.map((s) => [s.id, s.title])}
            />
          )}
          <span className="tag">
            {activeAI ? 'AI 在线模式' : '离线情景模拟'}
          </span>
        </div>
        <section className="task-brief">
          <h2>{challengeBrief && !done ? '先听清，再处理。' : scene.title}</h2>
          <p>{challengeBrief && !done ? challengeBrief : scene.description}</p>
          <div className="muted">
            {done ? '练习结束' : `进度 ${index + 1} / ${scene.steps.length}`} ·{' '}
            {settings.level}
          </div>
        </section>
        {capabilities.conversation && (
          <div className="row spaced">
            <Choice
              label="本次对话方式"
              value={settings.ai ? 'ai' : 'offline'}
              onChange={(v) => {
                if (!busy) setSettings({ ...settings, ai: v === 'ai' });
              }}
              items={[
                ['offline', '离线情景模拟'],
                ['ai', '在线 AI 对话'],
              ]}
            />
            <small className="muted">
              完成目标后沿课程流程继续；AI 负责理解和澄清。
            </small>
          </div>
        )}
        {history.length > 0 && (
          <details className="history">
            <summary>查看已发生的对话（{history.length}）</summary>
            {history.map((h, i) => (
              <div key={i} className={'chat-line ' + h.role}>
                <small>{h.role === 'user' ? 'あなた' : scene.role}</small>
                <p>
                  {h.role === 'user' ? (
                    h.text
                  ) : (
                    <Japanese text={h.text} mode={native ? 'native' : 'ruby'} />
                  )}
                </p>
              </div>
            ))}
          </details>
        )}
        {!done ? (
          <>
            <div className="npc-label">
              <span className="avatar">{scene.role[0]}</span>
              <b>{scene.role}</b>
              <small>あなたの番です</small>
            </div>
            <Sentence
              key={sceneId + '-' + index + '-' + npc.japanese}
              entry={npc}
              compact
              defaultMode={native ? 'hidden' : undefined}
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="reply-form"
            >
              <label htmlFor="reply">あなたの返答</label>
              <textarea
                id="reply"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                placeholder="用日语回应。也可以请求重复或放慢。"
                rows={3}
              />
              <div className="row spaced">
                <div className="row">
                  <button
                    type="button"
                    className={'secondary ' + (recording ? 'recording' : '')}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      recordStart();
                    }}
                    onPointerUp={recordStop}
                    onPointerCancel={recordStop}
                    onKeyDown={(e) => {
                      if (e.key === ' ' && !e.repeat) {
                        e.preventDefault();
                        recordStart();
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.key === ' ') {
                        e.preventDefault();
                        recordStop();
                      }
                    }}
                    onBlur={recordStop}
                  >
                    <Mic size={17} />
                    {recording ? '松开结束' : '按住录音'}
                  </button>
                </div>
                <button className="primary" disabled={busy || !input.trim()}>
                  <Send size={16} />
                  {busy ? '正在回应…' : '发送回答'}
                </button>
              </div>
              {recordUrl && (
                <div className="record-result">
                  <audio src={recordUrl} controls />
                  <a href={recordUrl} download="japanese-practice.webm">
                    保存录音
                  </a>
                  <small>可选录音仅供自己回听，不识别、不上传。</small>
                </div>
              )}
            </form>
            {!native && !challengeBrief && (
              <details
                className="help"
                open={difficulty(settings.level).help || undefined}
              >
                <summary>需要帮助？查看当前沟通目标</summary>
                <p>
                  {step.goal}。本地模式按关键信息推进，无法覆盖所有同义表达。
                </p>
                <button
                  className="text-link"
                  onClick={() => {
                    setAssisted(true);
                    setInput(plain(step.reply));
                  }}
                >
                  显示并使用示例回答
                </button>
                {assisted && (
                  <p>
                    本步骤使用过示例，会保留完成进度并加入巩固，不计作独立回应。
                  </p>
                )}
              </details>
            )}
          </>
        ) : (
          <section className="review-result">
            <span className="tag">ふりかえり</span>
            <h2>一次真实的交流，比一句满分答案更有价值。</h2>
            <Sentence entry={npcEntry(scene.end)} compact />
            <div className="stats">
              <div className="stat">
                <span>场景完成</span>
                <strong>✓</strong>
              </div>
              <div className="stat">
                <span>独立回应通过率</span>
                <strong>
                  {Math.round(
                    (results.filter((x) => x.accepted && !x.assisted).length /
                      Math.max(1, results.length)) *
                      100,
                  )}
                  <small>%</small>
                </strong>
              </div>
              <div className="stat">
                <span>平均回应耗时</span>
                <strong>
                  {(
                    results.reduce((a, x) => a + x.ms, 0) /
                    Math.max(1, results.length) /
                    1000
                  ).toFixed(1)}
                  <small>秒</small>
                </strong>
              </div>
            </div>
            <p className="muted">
              以上是练习记录，不是 AI
              能力评分。听力、语法与自然度需要语境评估；自由输入不按模板唯一判定。
            </p>
            <div className="metric-grid">
              {[
                '自然度',
                '语法',
                '词汇',
                '敬语',
                '反应速度',
                '场景适切度',
                '听力理解',
                '表达效率',
              ].map((k) => (
                <div key={k}>
                  <span>{k}</span>
                  <b>
                    {aiReview?.metrics?.[k] ??
                      (aiReview ? '无独立证据' : '待 AI 评估')}
                  </b>
                </div>
              ))}
            </div>
            {activeAI && (
              <button
                className="secondary"
                onClick={reviewAI}
                disabled={busy || !!aiReview}
              >
                {busy ? '评估中…' : aiReview ? '复盘已保存' : 'AI 语境复盘'}
              </button>
            )}
            {(aiReview?.items || results).map((r: any, i: number) => (
              <article className="review-item" key={i}>
                {r.reference && <span className="tag">课程校对依据</span>}
                <div className="row spaced">
                  <b>あなた：{r.original}</b>
                  <span className="tag">
                    {r.stars
                      ? '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars)
                      : '自然度未判定'}
                  </span>
                </div>
                <p>
                  <small>より自然 · 可选表达</small>
                  <br />
                  <Japanese text={r.natural} />
                </p>
                <p>
                  <small>日本人更常见的表达</small>
                  <br />
                  <Japanese text={r.common} />
                </p>
                <p>
                  <small>店員なら · 工作人员说法</small>
                  <br />
                  <Japanese text={r.staff} />
                </p>
                <p>{r.why}</p>
                <div className="muted">
                  书面程度：{r.written} · 敬语过度：{r.overpolite} · 礼貌不足：
                  {r.underpolite}
                </div>
              </article>
            ))}
            <h3>今日覚えるべき表現</h3>
            {aiReview?.remember?.length > 0 && (
              <>
                <p className="muted">AI 推荐表达已加入个人词库与 SRS。</p>
                {reviewExpressions(aiReview.remember, scene.category).map(
                  (e) => (
                    <Sentence key={e.id} entry={e} compact />
                  ),
                )}
              </>
            )}
            <p className="muted">
              课程回应重点已加入复习；优先选择本轮未完成或反应慢的目标，最多五条。
            </p>
            {remembered.map((entry) => (
              <Sentence key={entry.id} compact entry={entry} />
            ))}
            <div className="row">
              <button
                className="primary"
                onClick={() =>
                  remembered.forEach((entry) => mark(entry.id, 'review'))
                }
              >
                将本次重点加入 SRS
              </button>
              {!locked && (
                <button className="secondary" onClick={() => reset(scene.id)}>
                  <RotateCcw size={16} />
                  再练一次
                </button>
              )}
            </div>
          </section>
        )}
      </div>
      <aside className="conversation-aside">
        <section className="panel">
          <h3>練習の設定</h3>
          <p className="muted">现实流程、自然回应。需要时主动向对方确认。</p>
          <Choice
            label="模拟方式"
            value={activeAI ? 'ai' : 'offline'}
            onChange={(v) => {
              reset(scene.id);
              setSettings({ ...settings, ai: v === 'ai' });
            }}
            items={
              capabilities.conversation
                ? [
                    ['offline', '离线情景模拟'],
                    ['ai', 'DeepSeek 角色扮演'],
                  ]
                : [['offline', '离线情景模拟']]
            }
          />
          <p className="muted">
            {!capabilities.loaded
              ? '正在检查 AI 连接配置…'
              : capabilities.conversation
                ? 'AI 已配置。选择在线模式后，对话内容会发送给配置的模型服务。'
                : 'DeepSeek 尚未配置。填写私有配置后刷新页面即可启用。'}
          </p>
          {settings.ai && capabilities.loaded && !capabilities.conversation && (
            <button
              className="secondary"
              onClick={() => setSettings({ ...settings, ai: false })}
            >
              切换到离线情景模拟
            </button>
          )}
          <button
            className="secondary"
            onClick={() => audio.play(npc.japanese)}
          >
            <Volume2 size={17} />
            听当前一句
          </button>
        </section>
        <section className="panel">
          <h3>让对方重复，也是一种能力。</h3>
          {['convenience-store-repeat', 'phrases-fine'].map((id) => (
            <Sentence
              key={id}
              entry={allEntries.find((e) => e.id === id)!}
              compact
            />
          ))}
        </section>
      </aside>
    </div>
  );
}
