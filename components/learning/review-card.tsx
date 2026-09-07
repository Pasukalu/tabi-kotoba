'use client';
import { useRef, useState } from 'react';
import type { Entry } from '@/lib/content';
import { useAudio, useLearning } from '@/lib/learning';
import { useStopwatch } from '@/lib/use-stopwatch';
import { Japanese, Sentence } from './text';

export default function ReviewCard({
  entry,
  mode,
  onGrade,
}: {
  entry: Entry;
  mode: string;
  onGrade: (correct: boolean, ms: number) => void;
}) {
  const audio = useAudio();
  const { settings } = useLearning();
  const timer = useStopwatch();
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [ms, setMs] = useState(0);
  const [failed, setFailed] = useState(false);
  const submitted = useRef(false);
  const busy = useRef(false);
  const effectiveMode =
    settings.level === 'Native Challenge' && mode === 'production'
      ? 'reading'
      : mode;
  const listening = effectiveMode === 'listening';
  async function begin() {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    if (listening) {
      setPlaying(true);
      const ok = await audio.play(entry.japanese);
      setPlaying(false);
      if (!ok) {
        busy.current = false;
        setFailed(true);
        return;
      }
    }
    timer.reset();
    setStarted(true);
    busy.current = false;
  }
  return (
    <div>
      <p>
        {listening
          ? '听完后回忆意思，以及现在应该怎么回应。'
          : effectiveMode === 'production'
            ? '根据意思说出日语，不要求与参考句逐字相同。'
            : '读出日语，并回忆它在场景中的意思。'}
      </p>
      {!started && (
        <button className="primary" disabled={playing} onClick={begin}>
          {playing
            ? '正在播放…'
            : listening
              ? '播放题目，开始回忆'
              : '显示题目，开始回忆'}
        </button>
      )}
      {failed && (
        <p role="status">本次播放未完成，请重试。不会计入错误或反应时间。</p>
      )}
      {started && (
        <>
          {!listening &&
            (effectiveMode === 'production' ? (
              <p>{entry.chinese}</p>
            ) : (
              <Japanese text={entry.japanese} mode="native" />
            ))}
          {!reveal && (
            <button
              className="secondary"
              onClick={() => {
                setMs(timer.elapsed());
                setReveal(true);
              }}
            >
              我已回忆，显示答案
            </button>
          )}
        </>
      )}
      {reveal && (
        <>
          <Sentence entry={entry} compact />
          <p className="muted">
            按刚才独立回忆的情况自评。不同的自然说法也可以；阅读解析的时间不计入反应速度。
          </p>
          <div className="row">
            <button
              className="secondary"
              onClick={() => {
                if (!submitted.current) {
                  submitted.current = true;
                  onGrade(false, ms);
                }
              }}
            >
              没想起来 · 10分钟
            </button>
            <button
              className="primary"
              onClick={() => {
                if (!submitted.current) {
                  submitted.current = true;
                  onGrade(true, ms);
                }
              }}
            >
              顺利想起 ✓
            </button>
          </div>
        </>
      )}
    </div>
  );
}
