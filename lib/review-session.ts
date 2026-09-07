import type { Entry } from './content';
import type { Srs } from './learning';
export type ReviewSession = {
  ids: string[];
  cursor: number;
  correct: number;
  paused: boolean;
  startedAt: number;
};
export function reviewQueue(
  entries: Entry[],
  srs: Record<string, Srs>,
  now: number,
  scene = 'all',
  limit = 20,
) {
  const allowed = new Set(
    entries
      .filter((entry) => scene === 'all' || entry.scene === scene)
      .map((entry) => entry.id),
  );
  return Object.entries(srs)
    .filter(([id, item]) => allowed.has(id) && item.due <= now)
    .sort((a, b) => b[1].wrong - a[1].wrong || a[1].due - b[1].due)
    .slice(0, Math.max(1, Math.min(100, limit)))
    .map(([id]) => id);
}
export function advanceReview(
  session: ReviewSession,
  expectedId: string,
  correct: boolean,
): ReviewSession {
  if (session.paused || session.ids[session.cursor] !== expectedId)
    return session;
  return {
    ...session,
    cursor: session.cursor + 1,
    correct: session.correct + Number(correct),
  };
}
