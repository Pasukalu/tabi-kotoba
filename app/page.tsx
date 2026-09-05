'use client';
import VisualTrainer from '@/components/learning/visual-trainer';
import BroadcastTraining from '@/components/learning/broadcast-training';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home,
  Map,
  MessagesSquare,
  Headphones,
  Utensils,
  BookOpen,
  Leaf,
  RotateCcw,
  UserRound,
  Search,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Provider, useLearning } from '@/lib/learning';
import { Choice, modes } from '@/components/learning/text';
import Dashboard from '@/components/learning/dashboard';
import {
  Scenes,
  Dictionary,
  Listening,
  MenuTraining,
  Culture,
  Review,
  Profile,
  Heading,
} from '@/components/learning/views';
import ConversationSession from '@/components/learning/conversation-session';
import DailyChallenge from '@/components/learning/daily-challenge';
const nav = [
  ['ホーム', '', Home],
  ['シーン', 'scenes', Map],
  ['会話', 'conversation', MessagesSquare],
  ['聞き取り', 'listening', Headphones],
  ['メニュー', 'menu', Utensils],
  ['単語', 'dictionary', BookOpen],
  ['日本生活', 'life', Leaf],
  ['復習', 'review', RotateCcw],
  ['プロフィール', 'profile', UserRound],
] as const;
function Shell() {
  const { settings, setSettings, progress } = useLearning();
  const pathname = usePathname(),
    searchParams = useSearchParams();
  const [path, setPath] = useState(pathname.split('/')[1] || ''),
    [params, setParams] = useState<URLSearchParams | null>(
      new URLSearchParams(searchParams.toString()),
    ),
    [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const sync = () => {
      setPath(location.pathname.split('/')[1] || '');
      setParams(new URLSearchParams(location.search));
    };
    sync();
    window.addEventListener('popstate', sync);
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('keydown', key);
    };
  }, []);
  const due = Object.values(progress.srs as Record<string, any>).filter(
    (s) => s.due <= Date.now(),
  ).length;
  return (
    <SidebarProvider style={{ '--sidebar-width': '224px' } as any}>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <Sidebar>
        <SidebarHeader>
          <a className="brand" href="/">
            <span>旅</span>
            <div>
              旅ことば<small>TABI KOTOBA</small>
            </div>
          </a>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-caption">YOUR JAPANESE JOURNEY</div>
          <nav aria-label="主导航">
            {nav.map(([label, id, Icon]) => (
              <a
                key={id}
                href={'/' + id}
                className={'nav-link ' + (path === id ? 'active' : '')}
                aria-current={path === id ? 'page' : undefined}
              >
                <Icon size={19} />
                {label}
                {id === 'review' && due > 0 && (
                  <span className="nav-count">{due}</span>
                )}
              </a>
            ))}
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <div className="sidebar-note">
            ことばの、その先へ。<p>把学过的日语，变成生活。</p>
          </div>
          <a href="/profile" className="profile">
            <span className="avatar">旅</span>
            <div>
              日本語学習者<small>{settings.level} · 自然表达进阶</small>
            </div>
          </a>
        </SidebarFooter>
      </Sidebar>
      <div className="workspace">
        <header className="topbar">
          <SidebarTrigger />
          <form className="search" action="/search">
            <Search size={18} />
            <input
              ref={searchRef}
              aria-label="全站搜索"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索表达、场景、词汇…"
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className="header-controls">
            <Choice
              label="全局显示方式"
              value={settings.mode}
              onChange={(v) => setSettings({ ...settings, mode: v })}
              items={modes}
            />
            <a href="/profile" className="avatar small" aria-label="个人设置">
              旅
            </a>
          </div>
        </header>
        <main className="content" id="main">
          {path === '' ? (
            <Dashboard />
          ) : path === 'scenes' ? (
            <Scenes />
          ) : path === 'daily' ||
            (path === 'conversation' && params?.get('daily') === '1') ? (
            <DailyChallenge />
          ) : path === 'conversation' ? (
            <>
              <Heading
                title={
                  params?.get('daily')
                    ? '今日の日本生活。'
                    : '覚えたことばを、会話に。'
                }
                sub="听懂对方，完成任务，再回头看自己的表达。"
              />
              <ConversationSession
                initial={params?.get('scene') || 'hotel-checkin'}
              />
            </>
          ) : path === 'reading' ? (
            <VisualTrainer />
          ) : path === 'broadcasts' ? (
            <BroadcastTraining />
          ) : path === 'listening' ? (
            <Listening />
          ) : path === 'menu' ? (
            <MenuTraining />
          ) : path === 'dictionary' ? (
            <Dictionary />
          ) : path === 'search' ? (
            <Dictionary global query={params?.get('q') || ''} />
          ) : path === 'life' ? (
            <Culture />
          ) : path === 'review' ? (
            <Review />
          ) : path === 'profile' ? (
            <Profile />
          ) : (
            <div className="empty-state">
              没有找到这个页面。<a href="/">回到首页</a>
            </div>
          )}
        </main>
        <footer className="site-footer">
          旅ことば · 学習 → シミュレーション → 実践 → ふりかえり{' '}
          <span>学习记录保存在此设备</span>
        </footer>
      </div>
    </SidebarProvider>
  );
}
export default function Page() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
