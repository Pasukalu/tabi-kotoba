import { allEntries, tokens } from './content';
const readings = new Map<string, Set<string>>();
for (const entry of allEntries)
  for (const part of tokens(entry.japanese)) {
    if (part.text === part.reading || !/[一-龯々]/.test(part.text)) continue;
    if (!readings.has(part.text)) readings.set(part.text, new Set());
    readings.get(part.text)!.add(part.reading);
  }
const byFirst = new Map<string, { text: string; reading: string }[]>();
for (const [text, choices] of readings) {
  if (choices.size !== 1) continue;
  const bucket = byFirst.get(text[0]) || [];
  bucket.push({ text, reading: [...choices][0] });
  byFirst.set(text[0], bucket);
}
for (const bucket of byFirst.values())
  bucket.sort((a, b) => b.text.length - a.text.length);

/** Complete missing readings only from unambiguous, authored vocabulary; never guess an unknown reading. */
export function fillKnownReadings(input: string) {
  if (/[\[\]]/.test(input.replace(/\[[^|\[\]]+\|[^\[\]]+\]/g, '')))
    return input;
  let length = 0;
  const parts = tokens(input).map((part) => {
    const start = length;
    length += part.text.length;
    return {
      ...part,
      start,
      end: length,
      annotated: part.text !== part.reading,
    };
  });
  const plain = parts.map((part) => part.text).join('');
  const starts = new Map(parts.map((part) => [part.start, part]));
  let output = '';
  for (let i = 0; i < plain.length;) {
    const match = byFirst.get(plain[i])?.find((candidate) => {
      if (!plain.startsWith(candidate.text, i)) return false;
      const end = i + candidate.text.length;
      // Never cut through an existing annotation, or replace a fully annotated span.
      return (
        !parts.some(
          (part) =>
            part.annotated &&
            ((part.start < i && part.end > i) ||
              (part.start < end && part.end > end)),
        ) &&
        parts.some(
          (part) =>
            !part.annotated &&
            part.start < end &&
            part.end > i &&
            /[一-龯々]/.test(
              plain.slice(Math.max(i, part.start), Math.min(end, part.end)),
            ),
        )
      );
    });
    if (match) {
      output += '[' + match.text + '|' + match.reading + ']';
      i += match.text.length;
      continue;
    }
    const part = starts.get(i);
    if (part?.annotated) {
      output += '[' + part.text + '|' + part.reading + ']';
      i = part.end;
    } else output += plain[i++];
  }
  return output;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function normalizeTutorReadings(
  value: unknown,
  review: boolean,
): unknown {
  if (!object(value)) return value;
  const fix = (record: Record<string, unknown>, fields: string[]) =>
    Object.fromEntries(
      Object.entries(record).map(([key, v]) => [
        key,
        fields.includes(key) && typeof v === 'string'
          ? fillKnownReadings(v)
          : v,
      ]),
    );
  if (!review) return fix(value, ['japanese', 'explanation']);
  return {
    ...value,
    items: Array.isArray(value.items)
      ? value.items.map((item) =>
          object(item) ? fix(item, ['natural', 'common', 'staff']) : item,
        )
      : value.items,
    remember: Array.isArray(value.remember)
      ? value.remember.map((item) =>
          object(item) ? fix(item, ['japanese', 'explanation']) : item,
        )
      : value.remember,
  };
}
