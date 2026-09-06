export type TranscriptLine = { role: 'staff' | 'user'; text: string };
export function appendTurn(
  history: TranscriptLine[],
  npc: string,
  user: string,
): TranscriptLine[] {
  const last = history.at(-1);
  return [
    ...history,
    ...(last?.role === 'staff' && last.text === npc
      ? []
      : [{ role: 'staff' as const, text: npc }]),
    { role: 'user', text: user },
  ];
}
