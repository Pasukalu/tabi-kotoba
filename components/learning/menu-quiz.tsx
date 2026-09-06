'use client';
import { useStopwatch } from '@/lib/use-stopwatch';
import { useState } from 'react';
import { menus } from '@/lib/content';
import { useLearning, useAudio } from '@/lib/learning';
import { Japanese, Sentence } from './text';
const aspects = [
  ['meat', '主要食材'],
  ['method', '烹饪方式'],
  ['flavor', '主要味型'],
  ['rawRisk', '仅凭菜单名，如何判断生熟情况'],
] as const;
export default function MenuQuiz() {
  const [index, setIndex] = useState(0),
    [step, setStep] = useState(0),
    [answers, setAnswers] = useState<boolean[]>([]),
    [picked, setPicked] = useState(''),
    [finished, setFinished] = useState(false);
  const { answer, settings } = useLearning(),
    audio = useAudio(),
    timer = useStopwatch();
  const entry = menus[index],
    key = aspects[step][0],
    correct = entry[key] || '需向店家确认';
  const distractors = [
    ...new Set(menus.map((m) => m[key] || '需向店家确认')),
  ].filter((v) => v !== correct);
  const options = [
    correct,
    ...Array.from(
      { length: Math.min(3, distractors.length) },
      (_, i) => distractors[(index + i) % distractors.length],
    ),
  ].sort((a, b) => a.localeCompare(b, 'zh'));
  function choose(value: string) {
    if (picked) return;
    setPicked(value);
    const result = [...answers, value === correct];
    setAnswers(result);
    if (step === 3) {
      answer(entry.id, result.every(Boolean), timer.elapsed() / aspects.length);
      setFinished(true);
    }
  }
  function next() {
    if (step < 3) {
      setStep(step + 1);
      setPicked('');
    } else {
      setIndex((index + 1) % menus.length);
      setStep(0);
      setPicked('');
      setAnswers([]);
      setFinished(false);
      timer.reset();
    }
  }
  return (
    <section className="panel quiz-panel">
      <span className="tag">
        菜单 {index + 1} / {menus.length} · 判断 {step + 1} / 4
      </span>
      <h2>{aspects[step][1]}</h2>
      <p className="jp">
        <Japanese
          text={entry.japanese}
          mode={settings.level === 'Native Challenge' ? 'native' : 'ruby'}
        />
      </p>
      <button className="secondary" onClick={() => audio.play(entry.japanese)}>
        🔊 听菜名
      </button>
      <div className="answers">
        {options.map((v) => (
          <button
            key={v}
            className={
              'answer ' +
              (picked === v ? (v === correct ? 'correct' : 'incorrect') : '')
            }
            disabled={!!picked}
            onClick={() => choose(v)}
          >
            {v}
            {picked === v ? (v === correct ? ' ✓' : ' ✗') : ''}
          </button>
        ))}
      </div>
      {picked && (
        <>
          <p role="status">
            {picked === correct
              ? '✓ 判断符合这道菜单的通常含义。'
              : '✗ 这道菜单的通常含义：' + correct}
          </p>
          {finished && (
            <>
              <p>
                本菜完成：{answers.filter(Boolean).length} /
                4。复习优先级使用四项判断的平均耗时，包含阅读与思考，不代表纯听力反应。
              </p>
              <Sentence entry={entry} />
            </>
          )}
          <button className="primary" onClick={next}>
            {step < 3 ? '继续判断' : '下一道菜'}
          </button>
        </>
      )}
      <p className="muted">
        「通常熟食」是菜单构词判断，不是餐厅实际制作保证。配料和熟度仍可能因店家不同。
      </p>
    </section>
  );
}
