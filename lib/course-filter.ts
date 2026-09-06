import { type Entry, plain, kana, roman } from './content';
type Unit = { id: string; steps: { npc: string }[] };

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
    units.find((item) => item.id === unit)?.steps.map((step) => step.npc),
  );
  return entries.filter((entry) => {
    const inUnit =
      unit === 'all' ||
      (unit === 'staff'
        ? entry.formality === '店員側'
        : unit === 'reply'
          ? entry.formality !== '店員側'
          : entry.id.startsWith(unit + '-') || npcIds.has(entry.id));
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
