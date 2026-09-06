export const metricNames = [
  '自然度',
  '语法',
  '词汇',
  '敬语',
  '反应速度',
  '场景适切度',
  '听力理解',
  '表达效率',
] as const;
const object = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 3000): v is string =>
  typeof v === 'string' && v.length <= max;
const japanese = (v: unknown): v is string => {
  if (!text(v)) return false;
  let valid = true;
  const rest = v.replace(
    /\[([^|[\]]+)\|([^[\]]+)\]/g,
    (_whole, _word: string, reading: string) => {
      if (!reading.trim() || /[\p{Script=Han}々|]/u.test(reading))
        valid = false;
      return '';
    },
  );
  return valid && !/[\p{Script=Han}々[\]]/u.test(rest);
};
/** Treat upstream JSON as untrusted data, including values used by React and star.repeat(). */
export function validateAIOutput(value: unknown, review: boolean) {
  if (!object(value)) throw Error('AI response is not an object');
  if (!review) {
    if (!japanese(value.japanese)) throw Error('NPC_JAPANESE');
    if (!text(value.chinese)) throw Error('NPC_CHINESE');
    if (!japanese(value.explanation)) throw Error('NPC_EXPLANATION');
    if (typeof value.advance !== 'boolean') throw Error('NPC_ADVANCE');
    if (typeof value.done !== 'boolean') throw Error('NPC_DONE');
    if (
      !japanese(value.japanese) ||
      !String(value.japanese).trim() ||
      !text(value.chinese) ||
      !japanese(value.explanation) ||
      typeof value.advance !== 'boolean' ||
      typeof value.done !== 'boolean'
    )
      throw Error('Invalid NPC response');
    return {
      japanese: value.japanese,
      chinese: value.chinese,
      explanation: value.explanation,
      advance: value.advance,
      done: value.done,
    };
  }
  if (
    !object(value.metrics) ||
    !Array.isArray(value.items) ||
    value.items.length > 80 ||
    !Array.isArray(value.remember) ||
    value.remember.length > 5
  )
    throw Error('Invalid review');
  const metrics: Record<string, number | null> = {};
  for (const key of metricNames) {
    const n = value.metrics[key];
    if (
      n !== null &&
      (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100)
    )
      throw Error('Invalid metric');
    metrics[key] = n as number | null;
  }
  const items = value.items.map((item) => {
    if (!object(item)) throw Error('Invalid review item');
    for (const key of [
      'original',
      'why',
      'written',
      'overpolite',
      'underpolite',
    ])
      if (!text(item[key])) throw Error('Invalid review text');
    for (const key of ['natural', 'common', 'staff'])
      if (!japanese(item[key])) throw Error('Japanese readings missing');
    if (
      typeof item.stars !== 'number' ||
      !Number.isInteger(item.stars) ||
      item.stars < 1 ||
      item.stars > 5
    )
      throw Error('Invalid stars');
    return Object.fromEntries(
      [
        'original',
        'natural',
        'common',
        'staff',
        'why',
        'written',
        'overpolite',
        'underpolite',
        'stars',
      ].map((k) => [k, item[k]]),
    );
  });
  if (
    value.remember.some(
      (v) =>
        !object(v) ||
        !japanese(v.japanese) ||
        !text(v.chinese) ||
        !japanese(v.explanation),
    )
  )
    throw Error('Invalid expressions');
  return { metrics, items, remember: value.remember };
}
