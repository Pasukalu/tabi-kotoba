'use client';
import { useState } from 'react';
import { lessons } from '@/lib/content';
import { scenarios } from '@/lib/dialogue';
import { Sentence, AudioBar, Choice } from './text';
export default function CourseReader({ scene }: { scene: string }) {
  const [unit, setUnit] = useState('all'),
    [page, setPage] = useState(0);
  const list = lessons[scene].filter(
    (e) =>
      unit === 'all' ||
      (unit === 'staff'
        ? e.formality === '店員側'
        : unit === 'reply'
          ? e.id.includes('-reply-')
          : e.id.startsWith(unit + '-')),
  );
  const units = scenarios.filter(
    (s) =>
      s.category === scene &&
      lessons[scene].some((e) => e.id.startsWith(s.id + '-')),
  );
  const pages = Math.max(1, Math.ceil(list.length / 10)),
    current = Math.min(page, pages - 1),
    visible = list.slice(current * 10, current * 10 + 10);
  return (
    <>
      <div className="filter-bar">
        <Choice
          label="按训练单元阅读"
          value={unit}
          onChange={(v) => {
            setUnit(v);
            setPage(0);
          }}
          items={[
            ['all', '全部表达'],
            ['staff', '店员侧表达'],
            ['reply', '顾客回应'],
            ...units.map((s) => [s.id, s.title] as [string, string]),
          ]}
        />
        <Choice
          label="课程页码"
          value={String(current)}
          onChange={(v) => setPage(Number(v))}
          items={Array.from(
            { length: pages },
            (_, i) =>
              [String(i), `第 ${i + 1} / ${pages} 页`] as [string, string],
          )}
        />
      </div>
      <p className="muted">
        {list.length} 条表达 · 每页最多 10
        条。选择具体情景后，可将学习内容带入模拟。
      </p>
      <AudioBar items={visible} />
      {visible.map((e) => (
        <Sentence key={e.id} entry={e} />
      ))}
      {units.some((s) => s.id === unit) && (
        <a className="primary" href={'/conversation?scene=' + unit}>
          用这个场景练对话 →
        </a>
      )}
    </>
  );
}
