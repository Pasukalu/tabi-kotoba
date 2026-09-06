'use client';
import { useCallback, useState } from 'react';
import { Conversation } from './conversation';
import { Choice } from './text';
import { useLearning, type Progress } from '@/lib/learning';
import {
  chooseSurprise,
  surpriseTasks,
  surpriseDraftKey,
  type SurpriseRun,
} from '@/lib/surprise';
import type { ConversationDraft } from '@/lib/daily';
import { names } from '@/lib/content';
import { scenarios } from '@/lib/dialogue';

export default function SurprisePractice() {
  const { progress, setProgress, loaded } = useLearning();
  const [category, setCategory] = useState('all');
  const run: SurpriseRun | null = progress.surpriseRun;
  const task = surpriseTasks.find((task) => task.id === run?.taskId);
  const key = run ? surpriseDraftKey(run) : '';
  const draft: ConversationDraft | undefined = progress.conversationDrafts[key];
  const recent = Object.entries(
    progress.conversationDrafts as Progress['conversationDrafts'],
  )
    .flatMap(([savedKey, savedDraft]) => {
      const match = /^surprise:([^:]+):(\d+)$/.exec(savedKey);
      const savedTask =
        match &&
        surpriseTasks.find(
          (task) => task.id === match[1] && task.sceneId === savedDraft.sceneId,
        );
      return match && savedTask
        ? [
            {
              key: savedKey,
              task: savedTask,
              startedAt: Number(match[2]),
              done: savedDraft.done,
            },
          ]
        : [];
    })
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 8);
  const save = useCallback(
    (value: ConversationDraft) =>
      setProgress((current: Progress) => {
        if (
          !current.surpriseRun ||
          surpriseDraftKey(current.surpriseRun) !== key
        )
          return current;
        return {
          ...current,
          conversationDrafts: { ...current.conversationDrafts, [key]: value },
        };
      }),
    [key, setProgress],
  );
  function begin() {
    const next = chooseSurprise(category, run?.taskId);
    if (!next) return;
    setProgress((current: Progress) => {
      const older = Object.keys(current.conversationDrafts)
        .filter(
          (key) =>
            key.startsWith('surprise:') && current.conversationDrafts[key].done,
        )
        .slice(0, -99);
      const keep = Object.fromEntries(
        Object.entries(current.conversationDrafts).filter(
          ([key]) => !older.includes(key),
        ),
      );
      return { ...current, surpriseRun: next, conversationDrafts: keep };
    });
  }
  if (!loaded) return <output>正在恢复实战进度…</output>;
  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">実戦 · SURPRISE</span>
        <h1>予定どおりに、いかない日。</h1>
        <p>只知道自己的行程，接下来的问题要从对方的话里听出来。</p>
      </header>
      <section className="panel">
        <div className="filter-bar">
          <Choice
            label="突发实战场景范围"
            value={category}
            onChange={setCategory}
            items={[
              ['all', '随机场景'],
              ...[...new Set(surpriseTasks.map((task) => task.category))].map(
                (id) => [id, names[id]] as [string, string],
              ),
            ]}
          />
          <button className="primary" onClick={begin}>
            {' '}
            {task ? '另抽一次（保留当前记录）' : '开始突发实战'}{' '}
          </button>
        </div>
        <p className="muted">
          {surpriseTasks.length}{' '}
          个可抽取任务。开场不透露异常详情，不提供示例答案。可以请求重复或放慢；结束后再看原场景说明和复盘。
        </p>
        {task && !draft?.done && (
          <p className="muted">
            当前实战会自动续练。也可以先抽取其他任务，再从最近记录回来继续。
          </p>
        )}
        {recent.length > 0 && (
          <details>
            <summary>最近8次实战 · 恢复进度</summary>
            <div className="filter-bar">
              {recent.map((item) => (
                <button
                  key={item.key}
                  className="secondary"
                  disabled={item.key === key}
                  onClick={() =>
                    setProgress((current: Progress) => ({
                      ...current,
                      surpriseRun: {
                        taskId: item.task.id,
                        startedAt: item.startedAt,
                      },
                    }))
                  }
                >
                  {names[item.task.category]} ·{' '}
                  {new Date(item.startedAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {item.done ? '已完成' : '继续'}
                </button>
              ))}
            </div>
          </details>
        )}
      </section>
      {task && run ? (
        <Conversation
          key={key}
          initial={task.sceneId}
          locked
          challengeBrief={task.brief}
          draft={
            draft?.sceneId === task.sceneId &&
            draft.index >= 0 &&
            draft.index <
              (scenarios.find((scene) => scene.id === task.sceneId)?.steps
                .length || 0)
              ? draft
              : undefined
          }
          onSnapshot={save}
        />
      ) : (
        <section className="panel">
          <h2>先确认自己的情况</h2>
          <p>
            例如房号、车票、手上的预约邮件。你无需猜测还没发生的事情；开始后按工作人员的实际提问回应。
          </p>
        </section>
      )}
    </>
  );
}
