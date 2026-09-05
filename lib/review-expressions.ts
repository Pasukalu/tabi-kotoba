import { kana, roman, type Entry } from './content';
export function reviewExpressions(
  items: { japanese: string; chinese: string; explanation: string }[],
  scene: string,
): Entry[] {
  return items.slice(0, 5).map((item) => {
    let hash = 2166136261;
    for (const c of item.japanese)
      hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    return {
      id: 'personal-' + (hash >>> 0).toString(16),
      ...item,
      kana: kana(item.japanese),
      romaji: roman(item.japanese),
      scene,
      category: 'phrase',
      jlpt: '生活',
      formality: '依语境',
      frequency: 0,
      nativeFrequency: 'AI 复盘推荐；非频率统计',
      example: null,
      audio: null,
      notes: '来自本次 AI 语境复盘，可结合原始对话判断。',
      pitfalls: 'AI 生成的读音与语言建议仍可能出错。',
    };
  });
}
