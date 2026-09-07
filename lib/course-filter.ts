import { type Entry, plain, kana, roman } from './content';
type Unit = { id: string; steps: { npc: string; reply?: string }[] };

export function filterCourse(
  entries: Entry[],
  unit: string,
  query: string,
  units: Unit[],
) {
  const normalize = (value: string) =>
    value.normalize('NFKC').toLocaleLowerCase().trim();
  const search = normalize(query);
  const npcIds = new Set(
    units
      .find((item) => item.id === unit)
      ?.steps.flatMap((step) => [step.npc, step.reply || '']),
  );
  const staffLines = new Set(
    units.flatMap((item) => item.steps.map((step) => step.npc)),
  );
  return entries.filter((entry) => {
    const inUnit =
      unit === 'all' ||
      (unit === 'staff'
        ? entry.formality === '店員側' ||
          staffLines.has(entry.id) ||
          staffLines.has(entry.japanese)
        : unit === 'reply'
          ? entry.formality !== '店員側' &&
            !staffLines.has(entry.id) &&
            !staffLines.has(entry.japanese)
          : entry.id.startsWith(unit + '-') ||
            npcIds.has(entry.id) ||
            npcIds.has(entry.japanese));
    if (!inUnit) return false;
    if (!search) return true;
    return [
      plain(entry.japanese),
      entry.kana || kana(entry.japanese),
      entry.romaji || roman(entry.japanese),
      entry.chinese,
      entry.notes,
    ].some((value) => normalize(value).includes(search));
  });
}
