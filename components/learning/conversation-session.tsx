'use client';
import { useState, useCallback, useEffect } from 'react';
import { Conversation } from './conversation';
import { Choice } from './text';
import { scenarios } from '@/lib/dialogue';
import { useLearning } from '@/lib/learning';
import type { ConversationDraft } from '@/lib/daily';
import type { Progress } from '@/lib/learning';
import { names } from '@/lib/content';
import { searchScenarios } from '@/lib/scenario-search';
export default function ConversationSession({ initial }: { initial: string }) {
  const { progress, setProgress, loaded } = useLearning();
  const validInitial = scenarios.some((s) => s.id === initial)
    ? initial
    : scenarios[0].id;
  const [scene, setScene] = useState(validInitial),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [revision, setRevision] = useState(0);
  const matches = searchScenarios(query, category);
  const active = scenarios.find((item) => item.id === scene)!;
  const choices = matches.some((item) => item.id === scene)
    ? matches
    : [active, ...matches];
  function selectScene(id: string) {
    setScene(id);
    window.history.replaceState(
      {},
      '',
      '/conversation?scene=' + encodeURIComponent(id),
    );
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  useEffect(() => setScene(validInitial), [validInitial]);
  const save = useCallback(
    (draft: ConversationDraft) =>
      setProgress((p: Progress) => ({
        ...p,
        conversationDrafts: { ...p.conversationDrafts, [scene]: draft },
      })),
    [scene, setProgress],
  );
  function restart() {
    setProgress((p: any) => {
      const drafts = { ...p.conversationDrafts };
      delete drafts[scene];
      return { ...p, conversationDrafts: drafts };
    });
    setRevision((v) => v + 1);
  }
  if (!loaded) return <p role="status">正在恢复对话记录…</p>;
  const saved = progress.conversationDrafts?.[scene];
  const draft =
    saved &&
    saved.sceneId === scene &&
    saved.index < (scenarios.find((s) => s.id === scene)?.steps.length || 0)
      ? saved
      : undefined;
  return (
    <>
      <div className="filter-bar">
        <a className="secondary" href="/challenge">
          进入突发实战
        </a>
        <label>
          寻找要练的场景
          <input
            aria-label="搜索对话场景"
            placeholder="中文、日语、假名或罗马字"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Choice
          label="对话类别"
          value={category}
          onChange={setCategory}
          items={[
            ['all', '所有场景'],
            ...Object.entries(names).filter(([id]) =>
              scenarios.some((item) => item.category === id),
            ),
          ]}
        />
        <Choice
          label="对话场景"
          value={scene}
          onChange={selectScene}
          items={choices.map((s) => [
            s.id,
            s.title + (progress.completed.includes(s.id) ? ' · 已练习' : ''),
          ])}
        />
        <button className="secondary" onClick={restart}>
          重新开始当前场景
        </button>
        <span className="muted">打字内容与进度自动保存在此设备</span>
      </div>
      <p className="muted">
        找到 {matches.length}{' '}
        个场景。筛选不会中断当前对话；选择其他场景后，当前记录仍会保留。
      </p>
      <Conversation
        key={scene + '-' + revision}
        initial={scene}
        draft={draft}
        onSnapshot={save}
        locked
      />
    </>
  );
}
