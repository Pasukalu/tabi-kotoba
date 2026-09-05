'use client';
import { useState } from 'react';
import { Volume2, Star, RotateCcw, Check, Square, Repeat } from 'lucide-react';
import { Entry, tokens, kana, roman, plain } from '@/lib/content';
import { useLearning, useAudio } from '@/lib/learning';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
export const modes = [
  ['native', '原生日语'],
  ['ruby', '汉字＋振假名'],
  ['kana', '全假名'],
  ['romaji', 'Hepburn 罗马字'],
  ['zh', '中文意思'],
  ['explain', '日语解释'],
  ['hidden', '纯听力 · 隐藏'],
] as const;
export function Choice({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (x: string) => void;
  items: readonly (readonly [string, string])[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue>
          {items.find((x) => x[0] === value)?.[1] || value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map(([v, t]) => (
          <SelectItem value={v} key={v}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Japanese({
  text,
  mode = 'ruby',
  onWord,
}: {
  text: string;
  mode?: string;
  onWord?: (s: string) => void;
}) {
  return (
    <span lang="ja">
      {tokens(text).map((t, i) =>
        mode === 'ruby' && t.text !== t.reading ? (
          <ruby key={i}>
            {onWord ? (
              <button
                className="word-button"
                onClick={() => onWord(t.text)}
                aria-label={'播放 ' + t.text}
              >
                {t.text}
              </button>
            ) : (
              t.text
            )}
            <rt>{t.reading}</rt>
          </ruby>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </span>
  );
}
export function Sentence({
  entry,
  compact = false,
  defaultMode,
}: {
  entry: Entry;
  compact?: boolean;
  defaultMode?: string;
}) {
  const { settings, progress, mark } = useLearning(),
    { play, stop } = useAudio();
  const [local, setLocal] = useState(''),
    [loop, setLoop] = useState(false);
  let mode = local || defaultMode || settings.mode;
  const native = settings.level === 'Native Challenge';
  if (native && ['ruby', 'kana', 'romaji', 'zh', 'explain'].includes(mode))
    mode = 'native';
  return (
    <article className={'sentence ' + (compact ? 'compact' : '')}>
      <div className="sentence-tools">
        <span className="tag">
          {entry.category === 'word'
            ? entry.jlpt
            : entry.formality === '丁寧'
              ? '自然・丁寧'
              : entry.formality}
        </span>
        <div className="row">
          <Choice
            label="本句显示方式"
            value={mode}
            onChange={setLocal}
            items={
              native
                ? modes.filter((x) => ['native', 'hidden'].includes(x[0]))
                : modes
            }
          />
          <button
            className="icon-btn"
            aria-label="播放日语"
            onClick={() => play(entry.japanese, loop)}
          >
            <Volume2 size={19} />
          </button>
          <button
            className={'icon-btn ' + (loop ? 'selected' : '')}
            aria-label="单句循环"
            aria-pressed={loop}
            onClick={() => {
              setLoop(!loop);
              if (loop) stop();
              else play(entry.japanese, true);
            }}
          >
            <Repeat size={17} />
          </button>
          <button className="icon-btn" aria-label="停止播放" onClick={stop}>
            <Square size={14} />
          </button>
        </div>
      </div>
      <div
        className={'sentence-text ' + (mode === 'hidden' ? 'hidden-text' : '')}
      >
        {mode === 'hidden' ? (
          '•••  点击发音，专注听懂  •••'
        ) : mode === 'kana' ? (
          <span lang="ja">{entry.kana || kana(entry.japanese)}</span>
        ) : mode === 'romaji' ? (
          entry.romaji || roman(entry.japanese)
        ) : mode === 'zh' ? (
          entry.chinese
        ) : mode === 'explain' ? (
          <Japanese text={entry.explanation} mode="ruby" />
        ) : (
          <Japanese text={entry.japanese} mode={mode} onWord={(s) => play(s)} />
        )}
      </div>
      {!compact && (
        <>
          <div className="row sentence-actions">
            <button onClick={() => mark(entry.id, 'favorite')}>
              <Star
                size={16}
                fill={
                  progress.favorites.includes(entry.id)
                    ? 'currentColor'
                    : 'none'
                }
              />
              收藏
            </button>
            <button onClick={() => mark(entry.id, 'wrong')}>
              <RotateCcw size={16} />
              不会 / 加入复习
            </button>
            <button onClick={() => mark(entry.id, 'mastered')}>
              <Check size={16} />
              {progress.mastered.includes(entry.id) ? '已掌握' : '标记掌握'}
            </button>
          </div>
          {!native && mode !== 'hidden' && (
            <details>
              <summary>语境、自然度与用法</summary>
              <p>{entry.chinese}</p>
              <p>{entry.notes || entry.pitfalls}</p>
              <small>
                {entry.category === 'word'
                  ? `${entry.formality} · 频度 ${entry.frequency}/5 · ${entry.nativeFrequency}`
                  : '同一意思可以有多种自然说法。'}
              </small>
              {entry.example && (
                <div className="example">
                  <Japanese text={entry.example} />
                  <button
                    aria-label="播放例句"
                    className="icon-btn"
                    onClick={() => play(entry.example!)}
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              )}
            </details>
          )}
        </>
      )}
    </article>
  );
}
export function AudioBar({ items }: { items: Entry[] }) {
  const { settings, setSettings } = useLearning(),
    audio = useAudio();
  const [a, setA] = useState('0'),
    [b, setB] = useState(String(Math.max(0, items.length - 1)));
  const safeA = Math.min(+a, Math.max(0, items.length - 1)),
    safeB = Math.min(+b, Math.max(0, items.length - 1));
  return (
    <div className="audio-bar">
      <Choice
        label="播放速度"
        value={String(settings.speed)}
        onChange={(v) => setSettings({ ...settings, speed: Number(v) })}
        items={['0.7', '0.85', '1', '1.15'].map((x) => [x, x + '×'])}
      />
      <button onClick={() => audio.sequence(items.map((e) => e.japanese))}>
        连续播放
      </button>
      <button onClick={audio.pause}>暂停</button>
      <button onClick={audio.resume}>继续</button>
      <button onClick={audio.stop}>停止</button>
      <span>A–B 逐句循环</span>
      <Choice
        label="起点句"
        value={String(safeA)}
        onChange={setA}
        items={items.map((e, i) => [String(i), String(i + 1)])}
      />
      <Choice
        label="终点句"
        value={String(safeB)}
        onChange={setB}
        items={items.map((e, i) => [String(i), String(i + 1)])}
      />
      <button
        disabled={!items.length || safeA > safeB}
        onClick={() =>
          audio.sequence(
            items.map((e) => e.japanese),
            safeA,
            safeB,
            true,
          )
        }
      >
        循环区间
      </button>
    </div>
  );
}
