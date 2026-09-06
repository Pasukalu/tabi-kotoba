import { plain } from './content';
const normalized = (value: string) =>
  plain(value)
    .normalize('NFKC')
    .replace(/[\s。、,.!！?？]/g, '')
    .toLowerCase();

/** Authored sample replies have known intent; do not let a model regress that decision. */
export function isKnownReply(input: string, sample: string) {
  return normalized(input) !== '' && normalized(input) === normalized(sample);
}

/** Reconcile an inconsistent flag only when both task intent and the exact next question agree. */
export function hasExplicitTransition(
  input: string,
  output: string,
  nextQuestion: string,
  accept: string,
) {
  if (
    /ません|ではなく|ではない|じゃない|わからない|分からない|聞き取れ|もう一度|ゆっくり/.test(
      input,
    )
  )
    return false;
  return (
    new RegExp(accept, 'i').test(input.normalize('NFKC')) &&
    normalized(output).includes(normalized(nextQuestion))
  );
}

export function anchorTurn(
  output: {
    japanese: string;
    chinese: string;
    explanation: string;
    advance: boolean;
    done: boolean;
  },
  knownReply: boolean,
  next: { japanese: string; chinese: string; explanation: string },
  last: boolean,
) {
  const advance = knownReply || output.advance;
  return advance
    ? { ...next, advance: true, done: last }
    : { ...output, advance: false, done: false };
}
