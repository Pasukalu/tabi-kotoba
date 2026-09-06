'use client';
import { useState } from 'react';
import comparisons from '@/data/comparisons.json';
import { allEntries } from '@/lib/content';
import { Sentence, Choice } from './text';

export default function ExpressionCompare({ scene }: { scene: string }) {
  const groups = comparisons.filter(
    (group) => scene === 'phrases' || group.scenes.includes(scene),
  );
  const choices = groups.length ? groups : comparisons;
  const [selected, setSelected] = useState('');
  const group = choices.find((item) => item.id === selected) || choices[0];
  return (
    <section className="panel compare">
      <h3>同じ意味でも、距離が変わる。</h3>
      <p className="muted">
        对照角色、关系和场合来选择表达。「教科書」不表示错误，「かなり自然」也不表示总是更好。
      </p>
      <Choice
        label="表达对照主题"
        value={group.id}
        onChange={setSelected}
        items={choices.map((item) => [item.id, item.title])}
      />
      {group.entries.map((id) => {
        const entry = allEntries.find((item) => item.id === id);
        return entry ? <Sentence key={id} entry={entry} /> : null;
      })}
    </section>
  );
}
