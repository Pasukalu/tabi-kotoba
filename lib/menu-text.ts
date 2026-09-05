import { tokens, plain } from './content';
/** Extract a menu component without throwing away its original reading annotations. */
export function componentText(japanese: string, component: string): string {
  const start = plain(japanese).indexOf(component);
  if (start < 0) return japanese;
  const end = start + component.length;
  let position = 0,
    out = '';
  for (const token of tokens(japanese)) {
    const left = position,
      right = position + token.text.length;
    position = right;
    if (right <= start || left >= end) continue;
    if (token.text !== token.reading) {
      // Partial readings cannot safely be guessed: use the whole annotated compound.
      out += '[' + token.text + '|' + token.reading + ']';
    } else
      out += token.text.slice(
        Math.max(0, start - left),
        Math.min(token.text.length, end - left),
      );
  }
  return out;
}
