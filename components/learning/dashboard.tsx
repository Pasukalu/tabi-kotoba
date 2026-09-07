'use client';
import {
  ArrowUpRight,
  ArrowRight,
  Headphones,
  Hotel,
  TrainFront,
  Utensils,
  Flame,
} from 'lucide-react';
import { useLearning } from '@/lib/learning';
import { scenarios } from '@/lib/dialogue';
import { lessons } from '@/lib/content';
import { Progress } from '@/components/ui/progress';
import { Sentence } from './text';
import NextPractice from './next-practice';
import { learningInsights } from '@/lib/learning-insights';
import { useClock } from '@/lib/use-clock';
export default function Dashboard() {
  const { progress, settings, entries } = useLearning();
  const now = useClock();
  const insights = learningInsights(progress, entries, scenarios, now);
  let streak = 0;
  const day = new Date();
  if (!progress.days.includes(day.toLocaleDateString('sv-SE')))
    day.setDate(day.getDate() - 1);
  while (progress.days.includes(day.toLocaleDateString('sv-SE'))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">毎日、少しずつ。</div>
          <h1>今日も、日本語で過ごそう。</h1>
          <p>从听懂一句话，到从容应对一整天。</p>
        </div>
        <span className="date-badge">{settings.level} → 日本生活</span>
      </div>
      <div className="stats">
        {[
          ['连续学习', String(streak), '天'],
          [
            '掌握词汇',
            String(
              entries.filter(
                (entry) =>
                  entry.category === 'word' &&
                  progress.mastered.includes(entry.id),
              ).length,
            ),
            '词',
          ],
          ['已完成场景', String(insights.completed), '个'],
          [
            '课程完成度',
            insights.completed ? String(Math.round(insights.coverage)) : '—',
            insights.completed ? '%' : '待开始',
          ],
        ].map(([label, n, unit]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>
              {n}
              <small>{unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div>
          <section className="challenge">
            <div className="challenge-copy">
              <span className="pill">今日の日本生活 · DAILY CHALLENGE</span>
              <h2>今日の日本生活。</h2>
              <p>
                酒店、交通、餐厅与生活小插曲。
                <br />
                用日语，完成今天的每一步。
              </p>
              <div className="trip-line">
                <span>東京</span>
                <i />
                <TrainFront size={20} />
                <i />
                <span>京都</span>
              </div>
              <a className="primary light" href="/daily">
                开始 / 继续今日挑战 <ArrowRight size={17} />
              </a>
              <small>每日 8 个任务 · 可中途继续</small>
            </div>
            <div
              className="challenge-visual"
              role="img"
              aria-label="京都安静的传统街道"
            >
              <span>
                今日の旅
                <br />
                <b>京 都</b>
              </span>
            </div>
          </section>
          <a
            className="machine-home-link"
            href="/scenes?category=shinkansen&tab=machine"
          >
            <TrainFront size={22} />
            <div>
              <b>新干线购票实战</b>
              <p>选车 · 行李空间 · 座位图 · 乘车凭证 · 进站</p>
            </div>
            <ArrowRight size={20} />
          </a>
          <a className="machine-home-link" href="/reading">
            <ArrowRight size={22} />
            <div>
              <b>实景阅读与机器操作</b>
              <p>楼层牌 · 食券机 · 出口 · IC充值 · 储物柜 · 预约页面</p>
            </div>
            <ArrowRight size={20} />
          </a>
          <a className="machine-home-link" href="/challenge">
            <ArrowRight size={22} />
            <div>
              <b>突发实战：不知道下一句会发生什么</b>
              <p>只拿自己的行程信息，听懂异常、说明情况，再完成复盘。</p>
            </div>
            <ArrowRight size={20} />
          </a>
          <div className="section-heading">
            <h2>
              今日の練習 <small>推荐练习</small>
            </h2>
            <a href="/scenes">
              全部场景 <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="scene-grid">
            {[
              [
                Hotel,
                '01',
                'ホテル',
                '从容办理入住',
                '姓名确认 · 设施说明 · 突发状况',
              ],
              [
                Utensils,
                '02',
                'レストラン',
                '听懂点餐后的连续追问',
                '入店 · 点餐 · 结账',
              ],
              [
                TrainFront,
                '03',
                '電車・新幹線',
                '下一站，不再慌张',
                '换乘 · 选座 · 大件行李',
              ],
            ].map(([Icon, no, jp, cn, desc]: any) => (
              <a
                className="scene-card"
                href={
                  '/scenes?category=' +
                  ({ '01': 'hotel', '02': 'restaurant', '03': 'train' } as any)[
                    no
                  ]
                }
                key={no}
              >
                <div className="scene-top">
                  <Icon size={25} />
                  <span>{no}</span>
                </div>
                <h3>{jp}</h3>
                <b>{cn}</b>
                <p>{desc}</p>
                <div className="card-bottom">
                  学习 → 模拟 → 实战 <ArrowRight size={17} />
                </div>
              </a>
            ))}
          </div>
          <section className="expression">
            <div>
              <span className="eyebrow">日本人っぽい言い方</span>
              <h2>「正しい」から、「自然」へ。</h2>
              <p>语法正确之后，还有语气、距离感与场合。</p>
            </div>
            <div>
              <span className="tag">自然</span>
              <Sentence
                entry={lessons.restaurant.find(
                  (e) => e.id === 'restaurant-water',
                )!}
                compact
              />
              <small>「ください」也正确；在服务场景中，这样请求更柔和。</small>
            </div>
          </section>
        </div>
        <aside className="right-column">
          <section className="panel">
            <div className="section-heading">
              <h2>旅の準備度</h2>
              <span className="tag">起点</span>
            </div>
            <div className="readiness">
              <span>
                {insights.completed ? Math.round(insights.coverage) : '—'}
                <small>{insights.completed ? '课程完成度 %' : '未评估'}</small>
              </span>
            </div>
            <p className="center muted">
              课程完成度仅作进度参考，不代表能力测评。
            </p>
            {[
              ['ホテル', 'hotel'],
              ['レストラン', 'restaurant'],
              ['電車', 'train'],
              ['新幹線', 'shinkansen'],
            ].map(([x, id]) => (
              <div className="readiness-row" key={x}>
                <span>{x}</span>
                <span>
                  {
                    progress.completed.filter(
                      (s: string) =>
                        scenarios.find((z) => z.id === s)?.category === id,
                    ).length
                  }{' '}
                  场已完成
                </span>
                <Progress
                  value={
                    (progress.completed.filter(
                      (s: string) =>
                        scenarios.find((z) => z.id === s)?.category === id,
                    ).length /
                      Math.max(
                        1,
                        scenarios.filter((z) => z.category === id).length,
                      )) *
                    100
                  }
                />
              </div>
            ))}
            <a className="text-link" href="/conversation">
              开始第一次对话 <ArrowRight size={16} />
            </a>
          </section>
          <section className="listening-promo">
            <Headphones size={24} />
            <span className="eyebrow">耳を、日本に。</span>
            <h3>店员刚才问了什么？</h3>
            <p>
              袋子、加热、筷子、积分卡。
              <br />
              练习接住连续的日语提问。
            </p>
            <a className="text-link" href="/listening">
              开始听力训练 <ArrowUpRight size={17} />
            </a>
          </section>
          <div className="local-note">
            <Flame size={17} /> 每一次开口，都算数。
            <p>学习记录仅保存在当前设备。</p>
          </div>
        </aside>
      </div>
      <NextPractice />
      <div className="section-heading">
        <h2>
          最近のつまずき <small>最近错误</small>
        </h2>
        <a href="/review">去复习 →</a>
      </div>
      {progress.attempts.filter((x: any) => !x.correct).length ? (
        <p className="muted">
          最近有 {progress.attempts.filter((x: any) => !x.correct).length}{' '}
          次未答对，已进入复习队列。
        </p>
      ) : (
        <p className="muted">
          还没有错误记录。完成听力和阅读练习后，这里会提示优先复习内容。
        </p>
      )}
    </>
  );
}
