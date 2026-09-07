'use client';
import { useClock } from '@/lib/use-clock';
import { reviewQueue, advanceReview } from '@/lib/review-session';
import listeningMeanings from '@/data/listening-meanings.json';
import { searchScenarios } from '@/lib/scenario-search';
import OfflineSettings from './offline-settings';
import { useStopwatch } from '@/lib/use-stopwatch';
import ExpressionCompare from './expression-compare';
import { restorePreserving } from '@/lib/persistence';
import { difficulty } from '@/lib/difficulty';
import { componentText } from '@/lib/menu-text';
import { parseBackup } from '@/lib/storage';
import VisualTrainer from './visual-trainer';
import MenuQuiz from './menu-quiz';
import CourseReader from './course-reader';
import ServiceStatus from './service-status';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Headphones,
  Volume2,
  ArrowUpRight,
  Search,
  Download,
} from 'lucide-react';
import {
  allEntries,
  words,
  lessons,
  names,
  map,
  rules,
  menus,
  searchEntries,
} from '@/lib/content';
import { useLearning, useAudio } from '@/lib/learning';
import { Sentence, Japanese, Choice, modes, AudioBar } from './text';
import { scenarios } from '@/lib/dialogue';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import TicketMachine from './ticket-machine';
import ContextQuiz from './context-quiz';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
export function Heading({
  title,
  sub,
  kicker = '日本語を、日常に。',
}: {
  title: string;
  sub: string;
  kicker?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{kicker}</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
    </div>
  );
}
export function Scenes() {
  const [scene, setScene] = useState('hotel'),
    [tab, setTab] = useState('learn');
  useEffect(() => {
    const c = new URLSearchParams(location.search).get('category');
    if (c && lessons[c]) setScene(c);
    if (new URLSearchParams(location.search).get('tab') === 'machine')
      setTab('machine');
  }, []);
  const { progress } = useLearning();
  return (
    <>
      <Heading
        title="シーンから、身につける。"
        sub="先读懂真实表达，再让对话发生。选择一个场景开始。"
      />
      <div className="scene-filter">
        {Object.entries(names).map(([id, n]) => (
          <button
            className={'secondary ' + (id === scene ? 'selected' : '')}
            onClick={() => {
              setScene(id);
              setTab('learn');
            }}
            key={id}
          >
            {n}
          </button>
        ))}
      </div>
      <section className="lesson-header">
        <span className="route-number">
          {String(Object.keys(names).indexOf(scene) + 1).padStart(2, '0')}
        </span>
        <div>
          <h2>{names[scene]}</h2>
          <p>
            {lessons[scene].length} 个核心表达 ·{' '}
            {words.filter((e) => e.scene === scene).length} 个词条
          </p>
        </div>
        <a
          className="primary"
          href={
            '/conversation?scene=' +
            (scenarios.find((s) => s.category === scene)?.id || 'booking-late')
          }
        >
          进入模拟 <ArrowRight size={16} />
        </a>
      </section>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="learning-tabs">
          <TabsTrigger value="learn">01 学习</TabsTrigger>
          <TabsTrigger value="simulate">02 模拟</TabsTrigger>
          <TabsTrigger value="read">03 实战阅读</TabsTrigger>
          {scene === 'shinkansen' && (
            <TabsTrigger value="machine">购票实战</TabsTrigger>
          )}
          <TabsTrigger value="map">课程地图</TabsTrigger>
        </TabsList>
        <TabsContent value="learn">
          <CourseReader key={scene} scene={scene} />
          <section aria-label="本场景日本生活提示">
            <h3>日本生活メモ</h3>
            <div className="culture-grid">
              {rules
                .filter((rule) => rule.scenes.includes(scene))
                .map((rule) => (
                  <Rule key={rule.id} rule={rule} />
                ))}
            </div>
            {!rules.some((rule) => rule.scenes.includes(scene)) && (
              <p className="muted">本专题请结合每句表达的语境说明练习。</p>
            )}
          </section>
          {scene === 'phrases' && <ContextQuiz />}
          <ExpressionCompare key={scene} scene={scene} />
        </TabsContent>
        <TabsContent value="simulate">
          <div className="scene-grid">
            {scenarios
              .filter((s) => s.category === scene)
              .map((s) => (
                <a
                  className="scene-card"
                  href={'/conversation?scene=' + s.id}
                  key={s.id}
                >
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  <div className="card-bottom">
                    {progress.completed.includes(s.id)
                      ? '✓ 已练习'
                      : '开始完整流程'}
                    <ArrowRight size={16} />
                  </div>
                </a>
              ))}
          </div>
          {!scenarios.some((s) => s.category === scene) && (
            <div className="empty-state">
              此专题先练表达与阅读；完整对话可进入关联的预约、酒店或便利店场景。
              <a className="text-link" href="/conversation">
                打开场景对话
              </a>
            </div>
          )}
        </TabsContent>
        <TabsContent value="read">
          <VisualTrainer key={scene} category={scene} />
          <Reading scene={scene} />
        </TabsContent>
        {scene === 'shinkansen' && (
          <TabsContent value="machine">
            <TicketMachine />
          </TabsContent>
        )}
        <TabsContent value="map">
          <div className="panel">
            <h3>选择一条可以走完的训练路线</h3>
            <div className="scene-grid">
              {scenarios
                .filter((s) => s.category === scene)
                .map((s) => (
                  <a
                    className="scene-card"
                    key={s.id}
                    href={'/conversation?scene=' + s.id}
                  >
                    <h3>{s.title}</h3>
                    <p>{s.description}</p>
                    <span className="tag">
                      {progress.completed.includes(s.id)
                        ? '✓ 已完成'
                        : `${s.steps.length} 个沟通节点`}
                    </span>
                  </a>
                ))}
            </div>
            {!scenarios.some((s) => s.category === scene) && (
              <p>
                本专题先通过「学习」和「实战阅读」练习，再进入相关服务场景使用表达。
              </p>
            )}
            <details className="help">
              <summary>查看完整专题规划与内容边界</summary>
              <p className="muted">
                下面保留所有专题规划；部分细分项目尚未有独立课程。上方列出的路线均可实际练习。
              </p>
              <div className="topic-map">
                {map
                  .find((m) => m.id === scene)
                  ?.topics.map((t, i) => (
                    <div key={t}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {t}
                    </div>
                  ))}
              </div>
            </details>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
export function Dictionary({
  query = '',
  global = false,
}: {
  query?: string;
  global?: boolean;
}) {
  const { progress, entries } = useLearning();
  const [q, setQ] = useState(query),
    [scene, setScene] = useState('all'),
    [status, setStatus] = useState('all'),
    [page, setPage] = useState(1);
  useEffect(() => {
    setQ(query);
    setPage(1);
  }, [query]);
  const list = searchEntries(
    q,
    global ? entries : [...words, ...progress.extraEntries],
  ).filter(
    (e) =>
      (scene === 'all' || e.scene === scene) &&
      (status === 'all' ||
        (status === 'favorite'
          ? progress.favorites.includes(e.id)
          : status === 'mastered'
            ? progress.mastered.includes(e.id)
            : !!progress.srs[e.id])),
  );
  const pages = Math.ceil(list.length / 12);
  const matchedScenarios = global && q.trim() ? searchScenarios(q, scene) : [];
  const matchedRules =
    global && q.trim()
      ? rules.filter(
          (rule) =>
            (scene === 'all' || rule.scenes.includes(scene)) &&
            (rule.title + rule.text)
              .normalize('NFKC')
              .toLocaleLowerCase()
              .includes(q.normalize('NFKC').toLocaleLowerCase().trim()),
        )
      : [];
  const pageNumbers = [
    ...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages]),
  ]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);
  return (
    <>
      <Heading
        title={global ? 'ことばを探す。' : 'わたしの単語帳。'}
        sub={
          global
            ? '日语、假名、罗马字、中文；一起检索表达、例句、菜单与生活说明。'
            : `${words.length} 个生活词条。按场景积累，把不会的留给复习。`
        }
      />
      <div className="filter-bar">
        <div className="search">
          <Search size={18} />
          <input
            aria-label="搜索词条"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="例如：退房 / せいひょうき / yoyaku"
          />
        </div>
        <Choice
          value={scene}
          label="场景筛选"
          onChange={(v) => {
            setScene(v);
            setPage(1);
          }}
          items={[['all', '全部场景'], ...Object.entries(names)]}
        />
        <Choice
          value={status}
          label="学习状态筛选"
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          items={[
            ['all', '全部词条'],
            ['favorite', '我的收藏'],
            ['mastered', '已经掌握'],
            ['review', '复习队列'],
          ]}
        />
      </div>
      <p className="result-count">
        找到 {list.length} 条{global ? '学习内容' : '词汇'} · 第{' '}
        {Math.min(page, pages) || 1} 页
      </p>
      {matchedScenarios.length > 0 && (
        <section>
          <h2>相关对话 · {matchedScenarios.length}</h2>
          <div className="scene-grid">
            {matchedScenarios.slice(0, 6).map((item) => (
              <a
                className="scene-card"
                key={item.id}
                href={'/conversation?scene=' + item.id}
              >
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="text-link">进入对话 →</span>
              </a>
            ))}
          </div>
        </section>
      )}
      {matchedRules.map((r) => (
        <Rule key={r.id} rule={r} />
      ))}
      <div className="dictionary-grid">
        {list.slice((page - 1) * 12, page * 12).map((e) => (
          <Sentence key={e.id} entry={e} />
        ))}
      </div>
      {!list.length && !matchedScenarios.length && !matchedRules.length && (
        <div className="empty-state">
          暂无匹配。试试日语读音、中文词义或切换场景。
        </div>
      )}
      {pages > 1 && (
        <Pagination>
          <PaginationContent>
            {pageNumbers.map((number) => (
              <PaginationItem key={number}>
                <PaginationLink
                  href={'?page=' + number}
                  isActive={number === page}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(number);
                  }}
                >
                  {number}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
const listeningIds = [
  'convenience-store-bag',
  'convenience-store-heat',
  'convenience-store-chopsticks',
  'convenience-store-points',
  'convenience-store-rapid',
  'payment-method',
  'restaurant-people',
  'restaurant-ready',
  'restaurant-confirm',
  'train-announce',
  'train-safety',
  'train-delay',
];
export function Listening() {
  const { answer, settings } = useLearning(),
    audio = useAudio();
  const [i, setI] = useState(0),
    [selected, setSelected] = useState<number | null>(null),
    [show, setShow] = useState(false),
    [started, setStarted] = useState(false),
    [playing, setPlaying] = useState(false),
    [usedTranscript, setUsedTranscript] = useState(false),
    [score, setScore] = useState(0),
    [finished, setFinished] = useState(false);
  const timer = useStopwatch(),
    playbackId = useRef(0);
  useEffect(
    () => () => {
      playbackId.current++;
    },
    [],
  );
  const pool = listeningIds.map((id) => allEntries.find((e) => e.id === id)!);
  const entry = pool[i];
  const options = [
    entry,
    ...[
      pool[(i + 3) % pool.length],
      pool[(i + 6) % pool.length],
      pool[(i + 8) % pool.length],
    ],
  ].sort((a, b) => a.id.localeCompare(b.id));
  function choose(n: number) {
    if (selected !== null || !started) return;
    const correct = options[n].id === entry.id;
    setSelected(n);
    if (correct && !usedTranscript) setScore(score + 1);
    answer(entry.id, correct, timer.elapsed(), {
      assisted: usedTranscript,
    });
  }
  return (
    <>
      <Heading
        title="耳を、日本に。"
        sub="先听，再判断应该如何理解。正常服务语速也可以分段练习。"
      />
      <a className="machine-home-link" href="/broadcasts">
        <Headphones size={24} />
        <div>
          <b>听广播，决定下一步行动</b>
          <p>10条广播任务：站台、停运、回送、终点、方向与换乘。</p>
        </div>
        <ArrowRight size={20} />
      </a>
      <div className="listening-layout">
        <div className="panel listening-stage">
          <span className="tag">店員日本語 / 駅の放送</span>
          <h2>听到的这句话，是什么意思？</h2>
          <p className="muted">
            {i + 1} / {pool.length} · {settings.speed}× ·{' '}
            {settings.audioProvider === 'cloud'
              ? '云端日语语音'
              : '设备或浏览器日语语音'}
          </p>
          <button
            className="listen-circle"
            aria-label="播放题目"
            disabled={playing || selected !== null}
            onClick={async () => {
              const id = ++playbackId.current;
              setPlaying(true);
              setStarted(false);
              const heard = await audio.play(entry.japanese);
              if (id !== playbackId.current) return;
              setPlaying(false);
              if (heard) {
                timer.reset();
                setStarted(true);
              }
            }}
          >
            <Volume2 size={38} />
          </button>
          <div className="wave" aria-hidden="true">
            ▂ ▃ ▆ ▄ ▂ ▅ █ ▃ ▂ ▅ ▆ ▄ ▂ ▃
          </div>
          <div className="row centered">
            <button className="secondary" onClick={audio.pause}>
              暂停
            </button>
            <button className="secondary" onClick={audio.resume}>
              继续
            </button>
            <button
              className="secondary"
              onClick={() => {
                setShow(!show);
                if (selected === null) setUsedTranscript(true);
              }}
            >
              {show ? '隐藏' : '显示'}文字稿
            </button>
          </div>
          {show && <Sentence entry={entry} compact />}
          <div className="answers">
            {options.map((e, n) => (
              <button
                key={e.id}
                disabled={!started || selected !== null}
                className={
                  'answer ' +
                  (selected === n
                    ? e.id === entry.id
                      ? 'correct'
                      : 'incorrect'
                    : '')
                }
                onClick={() => choose(n)}
              >
                <span>{String.fromCharCode(65 + n)}</span>
                {settings.level === 'Native Challenge' ? (
                  <Japanese
                    text={
                      listeningMeanings[e.id as keyof typeof listeningMeanings]
                    }
                    mode="native"
                  />
                ) : (
                  e.chinese
                )}
                {selected === n && (e.id === entry.id ? ' ✓' : ' ✗')}
              </button>
            ))}
          </div>
          {selected !== null && (
            <div className="feedback" role="status">
              <b>
                {options[selected].id === entry.id
                  ? '✓ 理解正确'
                  : '✗ 已加入优先复习'}
              </b>
              <p>{entry.chinese}</p>
              <p>{entry.notes}</p>
              <button
                className="primary"
                onClick={() => {
                  playbackId.current++;
                  audio.stop();
                  if (i === pool.length - 1) setFinished(true);
                  else {
                    setI(i + 1);
                    setSelected(null);
                    setShow(false);
                    setUsedTranscript(false);
                    setStarted(false);
                    setPlaying(false);
                  }
                }}
              >
                下一题 <ArrowRight size={16} />
              </button>
            </div>
          )}
          {finished && (
            <div className="feedback">
              <h3>
                独立听懂：{score} / {pool.length}
              </h3>
              <p>错误与反应较慢的表达已进入复习队列。</p>
              <button
                className="secondary"
                onClick={() => {
                  setI(0);
                  setScore(0);
                  setFinished(false);
                  setStarted(false);
                  setShow(false);
                  setUsedTranscript(false);
                  setPlaying(false);
                  setSelected(null);
                }}
              >
                重新练习
              </button>
            </div>
          )}
        </div>
        <aside>
          <AudioBar items={pool} />
          <section className="panel">
            <h3>重点不是听见每一个字。</h3>
            <p>先抓动作：袋子、加热、付款、站台或停运，再确认自己该做什么。</p>
            <p className="muted">
              本轮是中文释义测验。Native Challenge
              请到会话页，使用隐藏字幕的日语任务。
            </p>
            <a
              className="text-link"
              href="/conversation?scene=convenience-rapid"
            >
              挑战连续追问 <ArrowRight size={16} />
            </a>
          </section>
        </aside>
      </div>
    </>
  );
}
export function MenuTraining() {
  const [tab, setTab] = useState('menu'),
    [selected, setSelected] = useState(0),
    [tokenIndex, setTokenIndex] = useState(0);
  const { play } = useAudio();
  const e = menus[selected];
  return (
    <>
      <Heading
        title="メニューを、読み解く。"
        sub="仿真菜单练习。拆开食材、部位与做法，想象端上桌的料理。"
      />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="learning-tabs">
          <TabsTrigger value="menu">读菜单 · 拆词</TabsTrigger>
          <TabsTrigger value="guess">菜单猜菜</TabsTrigger>
        </TabsList>
        <TabsContent value="menu">
          <div className="menu-layout">
            <section className="japanese-menu">
              <div className="menu-title">
                <span>おしながき</span>
                <h2>旅の食堂</h2>
                <p>本日のおすすめ · 练习用虚构菜单</p>
              </div>
              {menus.map((m, i) => (
                <button
                  key={m.id}
                  className={'menu-line ' + (selected === i ? 'chosen' : '')}
                  onClick={() => {
                    setSelected(i);
                    setTokenIndex(0);
                  }}
                >
                  <Japanese text={m.japanese} mode="native" />
                  <span>¥{m.price?.toLocaleString()}</span>
                </button>
              ))}
              <small>税込・价格仅用于阅读练习</small>
            </section>
            <div>
              <Sentence entry={e} />
              <section className="panel">
                <h3>拆词看料理</h3>
                <div className="token-grid">
                  {e.components?.map((t, i) => (
                    <button
                      key={i}
                      className="secondary"
                      onClick={() => {
                        play(componentText(e.japanese, t.text));
                        setTokenIndex(i);
                      }}
                    >
                      <Japanese text={componentText(e.japanese, t.text)} />
                      <Volume2 size={15} />
                    </button>
                  ))}
                </div>
                <p className="token-definition">
                  <b>{e.components?.[tokenIndex]?.text}</b> ·{' '}
                  {e.components?.[tokenIndex]?.meaning}
                </p>
                <p>{e.notes}</p>
                <dl className="dish-facts">
                  <dt>主材料</dt>
                  <dd>{e.meat}</dd>
                  <dt>烹饪方式</dt>
                  <dd>{e.method}</dd>
                  <dt>主要味型</dt>
                  <dd>{e.flavor}</dd>
                  <dt>生熟判断</dt>
                  <dd>{e.rawRisk}</dd>
                </dl>
              </section>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="guess">
          <MenuQuiz />
        </TabsContent>
      </Tabs>
    </>
  );
}
export function Reading({ scene = 'hotel' }: { scene?: string }) {
  const { answer } = useLearning(),
    [i, setI] = useState(0),
    [choice, setChoice] = useState(''),
    [revealed, setRevealed] = useState(false),
    [assisted, setAssisted] = useState(false);
  const timer = useStopwatch();
  const source = words.filter(
    (w) =>
      w.scene === scene ||
      (scene === 'convenience-store' &&
        ['payment', 'restaurant'].includes(w.scene)) ||
      (scene === 'booking' && w.scene === 'life'),
  );
  if (!source.length)
    return (
      <section className="panel">
        <p>本专题通过上方的情境阅读练习，不混用其他场景的标识。</p>
      </section>
    );
  const e = source[i % source.length];
  const options = [
    e,
    source[(i + 3) % source.length],
    source[(i + 5) % source.length],
  ].sort((a, b) => a.id.localeCompare(b.id));
  return (
    <section className="reading">
      <p className="muted">
        仿真标识 · 先判断含义，再点击文字查看读音。不使用真实设施的运营信息。
      </p>
      <div className={'sign ' + (scene === 'train' ? 'station' : '')}>
        <span className="sign-number">{i + 1}</span>
        <button
          onClick={() => {
            setRevealed(!revealed);
            setAssisted(true);
          }}
          aria-label="显示标识读音"
        >
          <Japanese text={e.japanese} mode={revealed ? 'ruby' : 'native'} />
        </button>
        <ArrowRight size={42} />
      </div>
      {revealed && <Sentence entry={e} compact />}
      <div className="answers">
        {options.map((o) => (
          <button
            key={o.id}
            disabled={!!choice}
            className={
              'answer ' +
              (choice === o.id ? (o.id === e.id ? 'correct' : 'incorrect') : '')
            }
            onClick={() => {
              setChoice(o.id);
              answer(e.id, o.id === e.id, timer.elapsed(), { assisted });
            }}
          >
            {o.chinese}
          </button>
        ))}
      </div>
      {choice && (
        <div className="feedback">
          {choice === e.id ? '✓ 正确' : '✗ 这里表示：' + e.chinese}
          <button
            className="secondary"
            onClick={() => {
              setI((i + 1) % source.length);
              setChoice('');
              setRevealed(false);
              setAssisted(false);
              timer.reset();
            }}
          >
            下一张标识
          </button>
        </div>
      )}
    </section>
  );
}
export function Rule({ rule: r }: { rule: any }) {
  return (
    <article className="rule panel">
      <div className="row spaced">
        <h3>{r.title}</h3>
        <span className="tag">{r.scope}</span>
      </div>
      <p>{r.text}</p>
      <footer>
        {r.sourceUrl ? (
          <a href={r.sourceUrl} target="_blank" rel="noreferrer">
            {r.source} <ArrowUpRight size={13} />
          </a>
        ) : (
          <span>{r.source}</span>
        )}
        <span>
          {r.lastVerified ? '核验：' + r.lastVerified : '使用时确认现场规定'}
        </span>
      </footer>
    </article>
  );
}
export function Culture() {
  const [filter, setFilter] = useState('all');
  return (
    <>
      <Heading
        title="知らないと困る日本。"
        sub="语言表达和现实规则分开学习。不把一家店的习惯，说成全日本的规定。"
      />
      <div className="filter-bar">
        <Choice
          label="生活知识分类"
          value={filter}
          onChange={setFilter}
          items={[
            ['all', '全部生活知识'],
            ['rule', '已核验的现实规则'],
            ['memo', '场景提醒与礼仪'],
          ]}
        />
      </div>
      <div className="life-practice-links">
        <a className="scene-card" href="/daily">
          <h3>今日の日本生活</h3>
          <p>从酒店到街头，连续完成一天的沟通。支持中途继续。</p>
          <span className="text-link">开始 / 继续挑战 →</span>
        </a>
        <a className="scene-card" href="/conversation?scene=booking-change">
          <h3>修改预约时间</h3>
          <p>希望的时段已满，怎样自然接受替代时间？</p>
          <span className="text-link">进入生活对话 →</span>
        </a>
        <a className="scene-card" href="/conversation?scene=life-parcel">
          <h3>把行李寄到酒店</h3>
          <p>先确认酒店收件与送达条件，再处理寄送。</p>
          <span className="text-link">开始练习 →</span>
        </a>
      </div>
      <ContextQuiz />
      <div className="culture-grid">
        {rules
          .filter((r) => filter === 'all' || r.type === filter)
          .map((r) => (
            <Rule key={r.id} rule={r} />
          ))}
      </div>
    </>
  );
}
export function Review() {
  const now = useClock();
  const { progress, setProgress, answer, entries } = useLearning(),
    [reveal, setReveal] = useState(false),
    [recallMs, setRecallMs] = useState(0),
    [scene, setScene] = useState('all'),
    [batchSize, setBatchSize] = useState('20');
  const saved = progress.reviewSession;
  const session = saved?.ids || [];
  const current = saved?.cursor || 0;
  const active = !!saved && !saved.paused;
  const queue = reviewQueue(
    entries,
    progress.srs,
    now,
    scene,
    Number(batchSize),
  );
  const timer = useStopwatch();
  const due = Object.entries(progress.srs as Record<string, any>)
    .filter(
      ([id, s]) =>
        s.due <= now && entries.some((e: { id: string }) => e.id === id),
    )
    .sort((a, b) => b[1].wrong - a[1].wrong || a[1].due - b[1].due);
  const entry = entries.find((e: any) => e.id === session[current]);
  function grade(correct: boolean) {
    if (!entry || !reveal || !saved || saved.paused) return;
    answer(entry.id, correct, recallMs);
    setProgress((p) => ({
      ...p,
      reviewSession: p.reviewSession
        ? advanceReview(p.reviewSession, entry.id, correct)
        : null,
    }));
    setReveal(false);
    timer.reset();
  }
  return (
    <>
      <Heading
        title="昨日のつまずきを、今日の自信に。"
        sub="优先复习答错、未听懂与反应慢的表达。练习记录只属于你的当前设备。"
      />
      <div className="stats">
        <div className="stat">
          <span>现在到期</span>
          <strong>{due.length}</strong>
        </div>
        <div className="stat">
          <span>复习队列</span>
          <strong>{Object.keys(progress.srs).length}</strong>
        </div>
        <div className="stat">
          <span>已掌握</span>
          <strong>{progress.mastered.length}</strong>
        </div>
        <div className="stat">
          <span>练习记录</span>
          <strong>{progress.attempts.length}</strong>
        </div>
      </div>
      {!active ? (
        <section className="panel">
          <h2>今日の復習</h2>
          <div className="filter-bar">
            <Choice
              label="复习场景"
              value={scene}
              onChange={setScene}
              items={[['all', '全部场景'], ...Object.entries(names)]}
            />
            <Choice
              label="每轮数量"
              value={batchSize}
              onChange={setBatchSize}
              items={['5', '10', '20', '50', '100'].map((n) => [n, n + ' 条'])}
            />
          </div>
          {saved?.paused && (
            <button
              className="primary"
              onClick={() => {
                setProgress((p) => ({
                  ...p,
                  reviewSession: p.reviewSession
                    ? { ...p.reviewSession, paused: false }
                    : null,
                }));
                setReveal(false);
                timer.reset();
              }}
            >
              继续上次复习 · {saved.cursor}/{saved.ids.length}
            </button>
          )}
          <p className="muted">
            回答错误或超过10秒，下次10分钟后复习；顺利回忆则按1天起逐步延长。连续三次正确后标记掌握。
          </p>
          <button
            className="primary"
            disabled={!queue.length}
            onClick={() => {
              setProgress((p) => ({
                ...p,
                reviewSession: {
                  ids: queue,
                  cursor: 0,
                  correct: 0,
                  paused: false,
                  startedAt: Date.now(),
                },
              }));
              setReveal(false);
              timer.reset();
            }}
          >
            {saved?.paused ? '替换暂停记录，开始新一轮' : '开始新一轮'} ·{' '}
            {queue.length} 条 <ArrowRight size={16} />
          </button>
          {!queue.length && (
            <p className="empty-state">
              当前场景没有到期内容。可切换场景，或在词典标记「不会」。
            </p>
          )}
        </section>
      ) : entry ? (
        <section className="panel review-flash">
          <button
            className="secondary"
            onClick={() =>
              setProgress((p) => ({
                ...p,
                reviewSession: p.reviewSession
                  ? { ...p.reviewSession, paused: true }
                  : null,
              }))
            }
          >
            暂停并保存
          </button>
          <span className="tag">
            {current + 1} / {session.length} · {progress.srs[entry.id]?.reason}
          </span>
          <Sentence key={entry.id} entry={entry} compact defaultMode="hidden" />
          <button
            className="secondary"
            disabled={reveal}
            onClick={() => {
              setRecallMs(timer.elapsed());
              setReveal(true);
            }}
          >
            我已回忆，显示答案
          </button>
          {reveal && (
            <>
              <p className="muted">
                按显示答案前的回忆情况自评；阅读解释不会增加反应时长。
              </p>
              <Sentence entry={entry} compact />
              <p>{entry.chinese}</p>
              <div className="row">
                <button className="secondary" onClick={() => grade(false)}>
                  没想起来 · 10分钟
                </button>
                <button className="primary" onClick={() => grade(true)}>
                  顺利想起 ✓
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="panel">
          <h2>
            {current < session.length
              ? '当前条目的课程内容不可用'
              : '✓ 本轮复习完成'}
          </h2>
          {current < session.length ? (
            <>
              <p>
                记录中包含当前版本没有的词条。保留已完成记录，跳过缺失条目后继续。
              </p>
              <button
                className="secondary"
                onClick={() =>
                  setProgress((p) => ({
                    ...p,
                    reviewSession: p.reviewSession
                      ? {
                          ...p.reviewSession,
                          ids: [
                            ...p.reviewSession.ids.slice(
                              0,
                              p.reviewSession.cursor,
                            ),
                            ...p.reviewSession.ids
                              .slice(p.reviewSession.cursor)
                              .filter((id) => entries.some((e) => e.id === id)),
                          ],
                        }
                      : null,
                  }))
                }
              >
                跳过缺失内容
              </button>
            </>
          ) : (
            <p>
              本轮自评顺利回忆 {saved?.correct || 0}/{session.length}{' '}
              条。下次时间已经按本轮表现安排。
            </p>
          )}
          <button
            className="secondary"
            onClick={() => setProgress((p) => ({ ...p, reviewSession: null }))}
          >
            返回复习概览
          </button>
        </section>
      )}
      <div className="section-heading">
        <h2>广播实战记录</h2>
      </div>
      {(progress.broadcastRuns || []).slice(0, 5).map((r: any, i: number) => (
        <details className="panel history" key={i}>
          <summary>
            {new Date(r.at).toLocaleDateString()} · 独立听懂{' '}
            {r.results.filter((x: any) => x.correct && !x.assisted).length}/
            {r.results.length}
          </summary>
          {r.results.map((x: any) => (
            <p key={x.id}>
              {allEntries.find((e) => e.id === x.id)?.chinese} ·{' '}
              {x.correct ? '✓' : '✗'} {x.assisted ? '辅助作答' : '独立作答'}
            </p>
          ))}
        </details>
      ))}
      <div className="section-heading">
        <h2>每日挑战档案</h2>
      </div>
      {Object.values(progress.dailyRuns || {}).length ? (
        <a className="panel text-link" href="/daily">
          查看或继续已保存的每日挑战 →
        </a>
      ) : (
        <p className="muted">开始每日挑战后，会按日期保存整日记录。</p>
      )}
      <div className="section-heading">
        <h2>购票实战记录</h2>
      </div>
      {(progress.machineRuns || []).slice(0, 5).map((r: any, i: number) => (
        <details className="panel history" key={'machine-' + i}>
          <summary>
            {new Date(r.at).toLocaleDateString()} · {r.booking.train} ·{' '}
            {r.booking.seat} · {r.mistakes.length} 次调整
          </summary>
          {r.mistakes.length ? (
            r.mistakes.map((m: any, n: number) => (
              <p key={n}>
                步骤 {m.step + 1}：{m.message}
              </p>
            ))
          ) : (
            <p>✓ 本次所有步骤首次完成。</p>
          )}
        </details>
      ))}
      <div className="section-heading">
        <h2>最近的会话复盘</h2>
      </div>
      {progress.reviews.length ? (
        progress.reviews.slice(0, 5).map((r: any, i: number) => (
          <details className="panel history" key={i}>
            <summary>
              {scenarios.find((s) => s.id === r.scene)?.title} ·{' '}
              {new Date(r.at).toLocaleDateString()}
            </summary>
            {(r.aiReview?.items || r.results).map((x: any, n: number) => (
              <div className="review-item" key={n}>
                <b>あなた：{x.original}</b>
                <p>
                  より自然：
                  <Japanese text={x.natural} />
                </p>
                <p>{x.why}</p>
              </div>
            ))}
            <a
              className="secondary"
              href={'/conversation?scene=' + encodeURIComponent(r.scene)}
            >
              回到这个场景再练一次
            </a>
          </details>
        ))
      ) : (
        <div className="empty-state">完成一次场景后，复盘会出现在这里。</div>
      )}
    </>
  );
}
export function Profile() {
  const { settings, setSettings, progress, setNotice } = useLearning();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () =>
      setVoices(
        speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ja')),
      );
    update();
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  const update = (k: string, v: any) =>
    setSettings({
      ...settings,
      [k]: v,
      ...(k === 'level' ? { speed: difficulty(v).rate } : {}),
    });
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, progress, settings }, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tabi-progress.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <Heading
        title="自分に合う、学び方。"
        sub="文字、速度与训练强度都由你决定。罗马字默认隐藏。"
      />
      <div className="settings-grid">
        <OfflineSettings />
        <ServiceStatus />
        <section className="panel settings-panel">
          <h2>文字と表示</h2>
          <label htmlFor="profile-choice-1">
            默认显示
            <Choice
              id="profile-choice-1"
              value={settings.mode}
              label="默认显示"
              onChange={(v) => update('mode', v)}
              items={modes}
            />
          </label>
          <label className="row spaced" htmlFor="profile-dark">
            深色模式
            <Switch
              id="profile-dark"
              checked={settings.dark}
              onCheckedChange={(v) => update('dark', v)}
              aria-label="深色模式"
            />
          </label>
          <label>
            正文字号 {settings.font}px
            <Slider
              aria-label="正文字号"
              min={16}
              max={24}
              step={1}
              value={[settings.font]}
              onValueChange={(v) => update('font', Array.isArray(v) ? v[0] : v)}
            />
          </label>
          <label>
            振假名大小 {Math.round(settings.ruby * 100)}%
            <Slider
              aria-label="振假名大小"
              min={0.45}
              max={0.8}
              step={0.05}
              value={[settings.ruby]}
              onValueChange={(v) => update('ruby', Array.isArray(v) ? v[0] : v)}
            />
          </label>
          <Sentence entry={lessons.hotel[1]} compact />
        </section>
        <section className="panel settings-panel">
          <h2>難易度と音声</h2>
          <label htmlFor="profile-choice-2">
            训练等级
            <Choice
              id="profile-choice-2"
              value={settings.level}
              label="训练等级"
              onChange={(v) => update('level', v)}
              items={[
                'N5',
                'N4',
                'N3',
                'N2',
                'N1',
                '日本生活',
                'Native Challenge',
              ].map((x) => [x, x])}
            />
          </label>
          <p className="muted">
            等级会调整建议语速、帮助显示和在线 NPC 提问复杂度，不等同 JLPT
            成绩。离线情景的业务流程相同；Native 隐藏翻译、读音与提示。
          </p>
          <label htmlFor="profile-choice-3">
            语速
            <Choice
              id="profile-choice-3"
              value={String(settings.speed)}
              label="语速"
              onChange={(v) => update('speed', Number(v))}
              items={['0.7', '0.85', '1', '1.15'].map((x) => [x, x + '×'])}
            />
          </label>
          <label htmlFor="profile-choice-4">
            语音来源
            <Choice
              id="profile-choice-4"
              value={settings.audioProvider}
              label="语音来源"
              onChange={(v) => update('audioProvider', v)}
              items={[
                ['browser', '设备日语语音'],
                ['cloud', '云端语音（需配置）'],
              ]}
            />
          </label>
          <label htmlFor="profile-choice-5">
            选择日语声音
            <Choice
              id="profile-choice-5"
              label="日语声音"
              value={settings.voiceName || 'auto'}
              onChange={(v) => update('voiceName', v === 'auto' ? '' : v)}
              items={[
                ['auto', '自动选择 ja-JP'],
                ...voices.map(
                  (v) =>
                    [
                      v.name,
                      v.name +
                        (v.localService
                          ? ' · 本机'
                          : ' · 浏览器提供的远程语音'),
                    ] as [string, string],
                ),
              ]}
            />
          </label>
          <p className="muted">
            可用日语声音：
            {voices.map((v) => v.name).join('、') ||
              '尚未检测到。添加系统日语语音后重试。'}
          </p>
          <p className="muted">
            只选择
            ja-JP。有些浏览器会提供远程日语语音，无需在本站配置额外密钥，但是否提供、音质与可用性取决于浏览器。独立云端服务可以使用
            Azure Japanese Neural。
          </p>
        </section>
        <section className="panel settings-panel">
          <h2>数据与离线</h2>
          <p>
            进度、收藏和SRS保存在此浏览器。不使用语音识别。可选录音只用于本机回听，不自动上传。
          </p>
          <button className="secondary" onClick={exportData}>
            <Download size={17} />
            导出学习记录
          </button>
          <label>
            从备份恢复
            <input
              type="file"
              accept="application/json"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 8000000) throw Error();
                  const d = parseBackup(await f.text());
                  restorePreserving(localStorage, d);
                  location.reload();
                } catch (error) {
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : '无法恢复备份，请检查文件和浏览器存储权限。',
                  );
                }
              }}
            />
          </label>
          <p className="muted">
            安装：iPhone 在 Safari 分享菜单选择「添加到主屏幕」；Android
            使用浏览器的安装功能。首次访问后缓存已加载页面；在线 AI
            和云端语音需联网。
          </p>
        </section>
        <section className="panel settings-panel">
          <h2>版本范围</h2>
          <p>
            {allEntries.length} 条结构化学习内容，{scenarios.length}{' '}
            条完整本地情景流程。地图保留扩充专题，尚未逐项制作全部高级课程。
          </p>
          <p>
            DeepSeek 与 Azure
            日语语音的服务端接口已实现，配置状态见上方。离线情景按信息匹配推进，不替代
            AI 语境评估。
          </p>
          <p className="muted">
            语言内容是原创训练语料。现实规则单独保存官方来源与核验日期。图片：
            <a
              href="https://unsplash.com/photos/empty-streets-w-Z49ZYO_gg"
              target="_blank"
              rel="noreferrer"
            >
              Sei / Unsplash
            </a>
            。
          </p>
        </section>
      </div>
    </>
  );
}
