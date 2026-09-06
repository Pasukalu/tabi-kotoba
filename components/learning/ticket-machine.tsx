'use client';
import { useState, useRef } from 'react';
import { ArrowRight, TrainFront, Ticket, Check } from 'lucide-react';
import { task, blankBooking, Booking, checkBooking } from '@/lib/booking';
import { allEntries } from '@/lib/content';
import { useLearning } from '@/lib/learning';
import { Sentence, Japanese, Choice } from './text';
import { Progress } from '@/components/ui/progress';
export default function TicketMachine() {
  const { answer, settings, setProgress } = useLearning();
  const [b, setB] = useState<Booking>({ ...blankBooking }),
    [step, setStep] = useState(0),
    [error, setError] = useState(''),
    [mistakes, setMistakes] = useState<{ step: number; message: string }[]>([]);
  const timer = useRef(Date.now());
  const train = task.trains.find((t) => t.id === b.train);
  const update = (key: keyof Booking, value: string | boolean) => {
    setB((p) => ({ ...p, [key]: value }));
    setError('');
  };
  const native = settings.level === 'Native Challenge';
  function next() {
    const failure = checkBooking(step, b);
    answer(task.steps[step].entryId, !failure, Date.now() - timer.current);
    if (failure) {
      setError(failure);
      setMistakes((p) => [...p, { step, message: failure }]);
      timer.current = Date.now();
      return;
    }
    setError('');
    if (step === 4)
      setProgress((p: any) => ({
        ...p,
        days: [...new Set([...p.days, new Date().toLocaleDateString('sv-SE')])],
        machineRuns: [
          { at: Date.now(), booking: b, mistakes },
          ...(p.machineRuns || []),
        ].slice(0, 20),
      }));
    setStep(step + 1);
    timer.current = Date.now();
  }
  return (
    <div className="ticket-practice">
      <section className="task-brief">
        <span className="tag">実戦 / TICKET LAB</span>
        <h2>{task.title}</h2>
        <p>{task.task}</p>
        <small>{task.disclaimer}</small>
      </section>
      <div className="machine-layout">
        <section className="ticket-machine">
          <header>
            <TrainFront />
            <b>新幹線 · 予約練習</b>
            <span>10:00</span>
          </header>
          <div className="machine-steps">
            {task.steps.map((s, i) => (
              <span
                key={s.title}
                aria-current={step === i ? 'step' : undefined}
                className={step === i ? 'current' : ''}
              >
                {i < step ? '✓' : i + 1} {s.title}
              </span>
            ))}
          </div>
          <Progress value={(Math.min(step, 5) / 5) * 100} />
          {step < 5 ? (
            <>
              <Sentence
                entry={{
                  ...allEntries[0],
                  id: 'machine-prompt-' + step,
                  japanese: task.steps[step].prompt,
                  kana: undefined,
                  romaji: undefined,
                  chinese: task.steps[step].chinese,
                  explanation: task.steps[step].prompt,
                }}
                compact
              />
              {step === 0 && (
                <div className="booking-fields">
                  <label htmlFor="ticket-choice-1">
                    出発駅
                    <Choice
                      id="ticket-choice-1"
                      label="出发站"
                      value={b.origin}
                      onChange={(v) => update('origin', v)}
                      items={['東京', '京都', '新大阪'].map((x) => [x, x])}
                    />
                  </label>
                  <ArrowRight />
                  <label htmlFor="ticket-choice-2">
                    到着駅
                    <Choice
                      id="ticket-choice-2"
                      label="到达站"
                      value={b.destination}
                      onChange={(v) => update('destination', v)}
                      items={['京都', '東京', '名古屋'].map((x) => [x, x])}
                    />
                  </label>
                </div>
              )}
              {step === 1 && (
                <div className="train-options">
                  {task.trains.map((t) => (
                    <button
                      className={
                        'train-option ' + (b.train === t.id ? 'selected' : '')
                      }
                      aria-pressed={b.train === t.id}
                      key={t.id}
                      onClick={() =>
                        setB((p) => ({
                          ...p,
                          train: t.id,
                          seat: '',
                          platform: '',
                          car: '',
                        }))
                      }
                    >
                      <b>{t.name}</b>
                      <span>
                        {t.departure} → {t.arrival}
                      </span>
                      <small>
                        <Japanese
                          text={
                            '[普通席|ふつうせき] ○ ／ [特大荷物|とくだいにもつ] ' +
                            (t.baggage ? '○' : '×')
                          }
                          mode={native ? 'native' : 'ruby'}
                        />
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {step === 2 && (
                <>
                  <p className="muted">○ 選択可　× 満席　□ 選択中</p>
                  <div className="seat-map">
                    <div className="seat-row seat-labels">
                      <span />
                      <span>A</span>
                      <span>B</span>
                      <span>C</span>
                      <span className="aisle" />
                      <span>D</span>
                      <span>E</span>
                    </div>
                    {task.seatRows.map((row) => (
                      <div key={row}>
                        <div className="seat-row">
                          <strong>{row}</strong>
                          {['A', 'B', 'C', 'aisle', 'D', 'E'].map((col) => {
                            if (col === 'aisle')
                              return <span className="aisle" key={col} />;
                            const id = row + col,
                              occupied = task.occupied.includes(id);
                            return (
                              <button
                                key={col}
                                disabled={occupied}
                                className={b.seat === id ? 'selected' : ''}
                                aria-label={
                                  id + (occupied ? ' 満席' : ' 選択可')
                                }
                                aria-pressed={b.seat === id}
                                onClick={() => update('seat', id)}
                              >
                                {occupied ? '×' : b.seat === id ? '□' : '○'}
                                <small>{id}</small>
                              </button>
                            );
                          })}
                        </div>
                        {row === task.baggageRow && (
                          <div className="baggage-zone">
                            <Japanese
                              text="[特大荷物|とくだいにもつ]スペースつき[座席|ざせき]"
                              mode={native ? 'native' : 'ruby'}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="muted">
                    A・E：窓側 / C・D：通路側。本图仅显示模拟车厢末尾三排。
                  </p>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="row">
                    <button
                      className={
                        'secondary ' + (b.method === 'paper' ? 'selected' : '')
                      }
                      onClick={() =>
                        setB((p) => ({
                          ...p,
                          method: 'paper',
                          prepared: false,
                        }))
                      }
                    >
                      <Ticket />
                      紙のきっぷ
                    </button>
                    <button
                      className={
                        'secondary ' + (b.method === 'ic' ? 'selected' : '')
                      }
                      onClick={() =>
                        setB((p) => ({ ...p, method: 'ic', prepared: false }))
                      }
                    >
                      交通系IC
                    </button>
                  </div>
                  {b.method && (
                    <div className="task-brief">
                      <p>
                        <Japanese
                          text={
                            b.method === 'paper'
                              ? '[予約|よやく]したきっぷを[受|う]け[取|と]ってください。'
                              : 'この[予約|よやく]の[乗車用|じょうしゃよう]ICカードを[指定|してい]してください。'
                          }
                          mode={native ? 'native' : 'ruby'}
                        />
                      </p>
                      <button
                        className="secondary"
                        onClick={() => update('prepared', true)}
                      >
                        {b.prepared
                          ? '✓ 準備完了'
                          : b.method === 'paper'
                            ? 'きっぷを受け取る（模擬）'
                            : 'ICカードを指定する（模擬）'}
                      </button>
                    </div>
                  )}
                  <p className="muted">
                    此训练采用两种常见凭证流程，具体售票渠道不同。QR
                    Ticket并非所有地区版本与产品均可使用。所有按钮只改变练习状态。
                  </p>
                </>
              )}
              {step === 4 && (
                <>
                  <div className="departure-board">
                    <b>予約情報 · 模擬</b>
                    <p>
                      {train?.name}　{train?.departure} → {train?.arrival}
                    </p>
                    <p>東京 → 京都</p>
                    <p>
                      <Japanese
                        text={
                          '[発車|はっしゃ]ホーム ' +
                          train?.platform +
                          ' / ' +
                          train?.car +
                          ' [号車|ごうしゃ] / ' +
                          b.seat
                        }
                        mode={native ? 'native' : 'ruby'}
                      />
                    </p>
                  </div>
                  <div className="booking-fields">
                    <label htmlFor="ticket-choice-3">
                      ホーム
                      <Choice
                        id="ticket-choice-3"
                        label="选择站台"
                        value={b.platform}
                        onChange={(v) => update('platform', v)}
                        items={['16', '17', '18', '19'].map((x) => [
                          x,
                          x + '番線',
                        ])}
                      />
                    </label>
                    <label htmlFor="ticket-choice-4">
                      号車
                      <Choice
                        id="ticket-choice-4"
                        label="选择车厢"
                        value={b.car}
                        onChange={(v) => update('car', v)}
                        items={['5', '6', '7', '8'].map((x) => [x, x + '号車'])}
                      />
                    </label>
                  </div>
                </>
              )}
              {error && (
                <div className="feedback" role="alert">
                  ✗ {native ? 'もう一度、条件を確認してください。' : error}
                </div>
              )}
              <div className="row spaced machine-actions">
                <button
                  className="secondary"
                  disabled={step === 0}
                  onClick={() => {
                    setStep(step - 1);
                    setError('');
                    timer.current = Date.now();
                  }}
                >
                  戻る
                </button>
                <button className="primary" onClick={next}>
                  {step === 4 ? '改札を通る（模擬）' : '次へ'}{' '}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="machine-complete">
              <Check size={38} />
              <h2>乗車準備ができました。</h2>
              <p>
                {train?.name} · {train?.car}号車 {b.seat}
              </p>
              <p>完成5步，调整了 {mistakes.length} 次选择。</p>
              <p className="muted">
                只记录本次任务完成情况，不等同真实铁路操作资格或日语能力评分。
              </p>
              {mistakes.map((m, i) => (
                <p key={i} className="feedback">
                  {task.steps[m.step].title}：{m.message}
                </p>
              ))}
              <div className="row">
                <button
                  className="primary"
                  onClick={() => {
                    setStep(0);
                    setB({ ...blankBooking });
                    setMistakes([]);
                    timer.current = Date.now();
                  }}
                >
                  再练一次
                </button>
                <a
                  className="secondary"
                  href="/conversation?scene=shinkansen-seat-conflict"
                >
                  下一关：座位被占了
                </a>
              </div>
            </div>
          )}
        </section>
        <aside className="panel">
          <h3>今回の条件</h3>
          <p>東京 → 京都</p>
          <p>到着：14:00まで</p>
          <p>荷物：三辺合計180cm</p>
          <p>人数：1名 / 窓側希望</p>
          {!native && (
            <details>
              <summary>日本生活メモ</summary>
              <p>
                列车有空位，不代表特大行李空间附带座席有空位。先看具体席种，再看座位。
              </p>
              <a href={task.sourceUrl} target="_blank" rel="noreferrer">
                SmartEX 官方规则 ↗
              </a>
              <p className="muted">核验：{task.lastVerified}</p>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
