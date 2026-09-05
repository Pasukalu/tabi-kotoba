'use client';
import { useState, useCallback, useEffect } from 'react';
import { Conversation } from './conversation';
import { Choice } from './text';
import { scenarios } from '@/lib/dialogue';
import { useLearning } from '@/lib/learning';
import type { ConversationDraft } from '@/lib/daily';
export default function ConversationSession({ initial }: { initial: string }) {
  const { progress, setProgress, loaded } = useLearning();
  const validInitial = scenarios.some((s) => s.id === initial)
    ? initial
    : scenarios[0].id;
  const [scene, setScene] = useState(validInitial),
    [revision, setRevision] = useState(0);
  useEffect(() => setScene(validInitial), [validInitial]);
  const save = useCallback(
    (draft: ConversationDraft) =>
      setProgress((p: any) => ({
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
        <Choice
          label="对话场景"
          value={scene}
          onChange={setScene}
          items={scenarios.map((s) => [s.id, s.title])}
        />
        <button className="secondary" onClick={restart}>
          重新开始当前场景
        </button>
        <span className="muted">打字内容与进度自动保存在此设备</span>
      </div>
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
