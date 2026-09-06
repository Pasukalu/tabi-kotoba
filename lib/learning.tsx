'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { allEntries, plain, type Entry } from './content';
import { validateProgress, normalizeSettings } from './storage';
import { readPreserving, recoveryCopies } from './persistence';
import { tts } from './audio';
import { offlineCache, cacheableLearningUrl } from './offline';
export type Srs = {
  due: number;
  interval: number;
  streak: number;
  wrong: number;
  reason: string;
};
export type Progress = {
  surpriseRun: import('./surprise').SurpriseRun | null;
  conversationDrafts: Record<string, import('./daily').ConversationDraft>;
  extraEntries: import('./content').Entry[];
  days: string[];
  mastered: string[];
  favorites: string[];
  completed: string[];
  srs: Record<string, Srs>;
  attempts: {
    id: string;
    correct: boolean;
    ms: number;
    at: number;
    assisted?: boolean;
  }[];
  reviews: any[];
  machineRuns: any[];
  broadcastRuns: any[];
  dailyRuns: Record<string, import('./daily').DailyRun>;
};
const empty: Progress = {
  surpriseRun: null,
  conversationDrafts: {},
  extraEntries: [],
  days: [],
  mastered: [],
  favorites: [],
  completed: [],
  srs: {},
  attempts: [],
  reviews: [],
  machineRuns: [],
  broadcastRuns: [],
  dailyRuns: {},
};
export type Settings = {
  voiceName: string;
  mode: string;
  speed: number;
  level: string;
  dark: boolean;
  font: number;
  ruby: number;
  audioProvider: string;
  ai: boolean;
};
const initial: Settings = {
  voiceName: '',
  mode: 'ruby',
  speed: 1,
  level: 'N2',
  dark: false,
  font: 16,
  ruby: 0.53,
  audioProvider: 'browser',
  ai: false,
};
type LearningContext = {
  notice: string;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  progress: Progress;
  setProgress: Dispatch<SetStateAction<Progress>>;
  loaded: boolean;
  setNotice: Dispatch<SetStateAction<string>>;
  entries: Entry[];
  mark: (id: string, type: string) => void;
  answer: (
    id: string,
    correct: boolean,
    ms: number,
    options?: { assisted?: boolean },
  ) => void;
};
const C = createContext<LearningContext | null>(null);
export const useLearning = () => {
  const context = useContext(C);
  if (!context) throw Error('Learning provider is required');
  return context;
};
export function Provider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(empty),
    [settings, setSettings] = useState<Settings>(initial),
    [loaded, setLoaded] = useState(false),
    [notice, setNotice] = useState('');
  const writable = useRef({ progress: false, settings: false });
  const [recoveryMessage, setRecoveryMessage] = useState('');
  useEffect(() => {
    try {
      const p = readPreserving(
        localStorage,
        'tabi-progress-v1',
        validateProgress,
        empty,
      );
      const s = readPreserving(
        localStorage,
        'tabi-settings-v1',
        normalizeSettings,
        initial,
      );
      setProgress(p.value);
      setSettings(s.value);
      writable.current = { progress: p.canSave, settings: s.canSave };
      setRecoveryMessage(
        p.issue ||
          s.issue ||
          (Object.keys(recoveryCopies(localStorage)).length
            ? '浏览器中保存着以前无法读取的记录副本，可下载保留。'
            : ''),
      );
    } catch {
      setRecoveryMessage(
        '浏览器暂不允许保存。本次练习可继续，原记录不会被覆盖。',
      );
    }
    setLoaded(true);
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .register('/sw.js')
        .then(async () => {
          await navigator.serviceWorker.ready;
          const urls = [
            location.href,
            ...performance.getEntriesByType('resource').map((e) => e.name),
          ].filter((u) => {
            return !!cacheableLearningUrl(u, location.origin);
          });
          const cache = await caches.open(offlineCache);
          await Promise.allSettled(
            urls.map(async (u) => {
              const response = await fetch(u);
              if (response.ok && !response.redirected)
                await cache.put(u, response);
            }),
          );
        })
        .catch(() => {});
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (writable.current.progress)
        localStorage.setItem('tabi-progress-v1', JSON.stringify(progress));
      if (writable.current.settings)
        localStorage.setItem('tabi-settings-v1', JSON.stringify(settings));
    } catch {
      setNotice('浏览器未允许保存，本次进度可能无法保留。');
    }
    document.documentElement.classList.toggle('dark', settings.dark);
    document.documentElement.style.setProperty(
      '--font-size',
      settings.font + 'px',
    );
    document.documentElement.style.setProperty(
      '--ruby-size',
      settings.ruby + 'em',
    );
  }, [progress, settings, loaded]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  function mark(id: string, type: string) {
    setProgress((p) => {
      const date = new Date().toLocaleDateString('sv-SE');
      const next = { ...p, days: [...new Set([...p.days, date])] };
      if (type === 'favorite')
        next.favorites = p.favorites.includes(id)
          ? p.favorites.filter((x) => x !== id)
          : [...p.favorites, id];
      if (type === 'mastered')
        next.mastered = [...new Set([...p.mastered, id])];
      if (type === 'review' || type === 'wrong') {
        next.srs = {
          ...p.srs,
          [id]: {
            due: Date.now(),
            interval: 0,
            streak: 0,
            wrong: (p.srs[id]?.wrong || 0) + (type === 'wrong' ? 1 : 0),
            reason: type === 'wrong' ? '答错或未听懂' : '主动加入',
          },
        };
        if (type === 'wrong')
          next.mastered = p.mastered.filter((x) => x !== id);
      }
      return next;
    });
    setNotice(
      type === 'favorite'
        ? '收藏已更新'
        : type === 'mastered'
          ? '已标记掌握'
          : '已加入优先复习',
    );
  }
  function answer(
    id: string,
    correct: boolean,
    ms: number,
    options: { assisted?: boolean } = {},
  ) {
    setProgress((p) => {
      const old = p.srs[id] || { interval: 0, streak: 0, wrong: 0 };
      const slow = ms > 10000 || !!options.assisted;
      const interval =
        correct && !slow
          ? old.interval
            ? Math.min(90, old.interval * 2.2)
            : 1
          : 0;
      return {
        ...p,
        days: [...new Set([...p.days, new Date().toLocaleDateString('sv-SE')])],
        mastered:
          correct && !slow && old.streak >= 2
            ? [...new Set([...p.mastered, id])]
            : p.mastered.filter((x) => (correct && !slow) || x !== id),
        srs: {
          ...p.srs,
          [id]: {
            interval,
            streak: correct && !slow ? old.streak + 1 : 0,
            wrong: old.wrong + (correct ? 0 : 1),
            reason: options.assisted
              ? '使用过读音或文字提示，需独立复习'
              : !correct
                ? '答错 / 未听懂'
                : slow
                  ? '反应超过10秒'
                  : '间隔复习',
            due: Date.now() + (interval ? interval * 86400000 : 600000),
          },
        },
        attempts: [
          ...p.attempts,
          { id, correct, ms, at: Date.now(), assisted: !!options.assisted },
        ].slice(-2000),
      };
    });
  }
  useEffect(() => {
    const mc = (document as any).modelContext;
    if (!mc?.registerTool) return;
    const ctrl = new AbortController();
    Promise.resolve(
      mc.registerTool(
        {
          name: 'add_expressions_to_review',
          description: '将已知词条加入当前设备复习队列，并显示复习页。',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 20,
              },
            },
            required: ['ids'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input: any) {
            if (
              !Array.isArray(input?.ids) ||
              input.ids.length < 1 ||
              input.ids.length > 20 ||
              input.ids.some((id: any) => !allEntries.some((e) => e.id === id))
            )
              throw Error('Invalid expression IDs');
            input.ids.forEach((id: string) => mark(id, 'review'));
            history.pushState({}, '', '/review');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return { queued: input.ids };
          },
        },
        { signal: ctrl.signal },
      ),
    ).catch(() => {});
    return () => ctrl.abort();
  }, []);
  return (
    <C.Provider
      value={{
        progress,
        setProgress,
        settings,
        setSettings,
        mark,
        answer,
        notice,
        setNotice,
        loaded,
        entries: [...allEntries, ...progress.extraEntries],
      }}
    >
      {recoveryMessage && (
        <aside className="recovery-banner" role="status">
          <p>{recoveryMessage}</p>
          <button
            className="secondary"
            onClick={() => {
              try {
                const copies = recoveryCopies(localStorage);
                if (!writable.current.progress)
                  copies['original-progress'] =
                    localStorage.getItem('tabi-progress-v1') || '';
                if (!writable.current.settings)
                  copies['original-settings'] =
                    localStorage.getItem('tabi-settings-v1') || '';
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        { format: 'tabi-recovery-raw', copies },
                        null,
                        2,
                      ),
                    ],
                    { type: 'application/json' },
                  ),
                );
                const link = document.createElement('a');
                link.href = url;
                link.download = 'tabi-recovery.json';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch {
                setNotice('无法读取副本，请检查浏览器的存储权限。');
              }
            }}
          >
            下载原始记录副本
          </button>
          <button className="secondary" onClick={() => setRecoveryMessage('')}>
            暂时收起
          </button>
        </aside>
      )}
      {children}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </C.Provider>
  );
}
export { tts } from './audio';
export function useAudio() {
  const { settings, setNotice } = useLearning();
  const serial = useRef(0);
  function stop() {
    serial.current++;
    tts('browser').stop();
    tts('cloud').stop();
  }
  async function play(text: string, loop = false, rateOverride?: number) {
    stop();
    const n = serial.current;
    const next = async (): Promise<boolean> => {
      if (n !== serial.current) return false;
      try {
        await tts(settings.audioProvider, settings.voiceName).play(
          plain(text),
          rateOverride ??
            (settings.level === 'Native Challenge' ? 1.15 : settings.speed),
        );
        if (n !== serial.current) return false;
        if (loop) void next();
        return true;
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') setNotice(e.message);
        return false;
      }
    };
    return next();
  }
  async function sequence(
    items: string[],
    a = 0,
    b = items.length - 1,
    loop = false,
  ) {
    stop();
    if (!items.length || a < 0 || b >= items.length || a > b) {
      setNotice('请先选择有效的音频句子区间。');
      return;
    }
    const n = serial.current;
    let i = a;
    function next() {
      if (n !== serial.current) return;
      if (i > b) {
        if (!loop) return;
        i = a;
      }
      tts(settings.audioProvider, settings.voiceName)
        .play(
          plain(items[i++]),
          settings.level === 'Native Challenge' ? 1.15 : settings.speed,
          next,
        )
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setNotice(e.message);
        });
    }
    next();
  }
  useEffect(() => () => stop(), []);
  return {
    play,
    stop,
    sequence,
    pause: () => tts(settings.audioProvider, settings.voiceName).pause(),
    resume: () => tts(settings.audioProvider, settings.voiceName).resume(),
  };
}
