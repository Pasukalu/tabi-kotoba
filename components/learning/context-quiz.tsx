'use client';
import { useStopwatch } from '@/lib/use-stopwatch';
import { useState } from 'react';
import questions from '@/data/context-quiz.json';
import { useLearning, useAudio } from '@/lib/learning';
import { Japanese } from './text';
import { Volume2, ArrowRight } from 'lucide-react';
export default function ContextQuiz() {
  const { answer, settings } = useLearning(),
    { play } = useAudio();
  const [i, setI] = useState(0),
    [chosen, setChosen] = useState<number | null>(null),
    [correct, setCorrect] = useState(0);
  const timer = useStopwatch();
  const q = questions[i];
  return (
    <section className="panel context-quiz">
      <span className="tag">ことばと文脈</span>
      <h2>同一句话，在这里是什么意思？</h2>
      <p className="muted">
        {i + 1} / {questions.length} · {q.context}
      </p>
      <div className="context-dialogue">
        <p>
          <span>相手</span>
          <Japanese
            text={q.npc}
            mode={settings.level === 'Native Challenge' ? 'native' : 'ruby'}
          />
          <button
            className="icon-btn"
            aria-label="播放提问"
            onClick={() => play(q.npc)}
          >
            <Volume2 size={18} />
          </button>
        </p>
        <p>
          <span>あなた</span>
          <Japanese
            text={q.reply}
            mode={settings.level === 'Native Challenge' ? 'native' : 'ruby'}
          />
          <button
            className="icon-btn"
            aria-label="播放回答"
            onClick={() => play(q.reply)}
          >
            <Volume2 size={18} />
          </button>
        </p>
      </div>
      <div className="answers">
        {q.options.map((text, n) => (
          <button
            className={
              'answer ' +
              (chosen === n ? (n === q.correct ? 'correct' : 'incorrect') : '')
            }
            disabled={chosen !== null}
            onClick={() => {
              setChosen(n);
              if (n === q.correct) setCorrect(correct + 1);
              answer(q.entryId, n === q.correct, timer.elapsed());
            }}
            key={text}
          >
            {text}
            {chosen === n && (n === q.correct ? ' ✓' : ' ✗')}
          </button>
        ))}
      </div>
      {chosen !== null && (
        <div className="feedback" role="status">
          <b>
            {chosen === q.correct
              ? '✓ 理解了上下文'
              : '✗ 再看前一句和当时的动作'}
          </b>
          <p>{q.why}</p>
          {i === questions.length - 1 ? (
            <>
              <p>
                本组完成：{correct} / {questions.length}
                。未理解的相关表达已加入复习。
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setI(0);
                  setChosen(null);
                  setCorrect(0);
                  timer.reset();
                }}
              >
                重新练习
              </button>
            </>
          ) : (
            <button
              className="primary"
              onClick={() => {
                setI(i + 1);
                setChosen(null);
                timer.reset();
              }}
            >
              下一个语境 <ArrowRight size={17} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
