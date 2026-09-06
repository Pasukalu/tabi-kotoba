import { allEntries, plain } from './content';
import scenarios from '@/data/scenarios.json';
const normalize = (text: string) =>
  text.normalize('NFKC').toLocaleLowerCase().trim();
const entryById = new Map(allEntries.map((entry) => [entry.id, entry]));
const index = new Map(
  scenarios.map((scene) => [
    scene.id,
    normalize(
      [
        scene.title,
        scene.description,
        scene.role,
        ...scene.steps.flatMap((step) => {
          const entry = entryById.get(step.npc);
          return entry
            ? [
                plain(entry.japanese),
                entry.kana || '',
                entry.romaji || '',
                entry.chinese,
                step.goal,
              ]
            : [plain(step.npc), step.goal];
        }),
      ].join(' '),
    ),
  ]),
);
export function searchScenarios(query: string, category = 'all') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return scenarios.filter(
    (scene) =>
      (category === 'all' || scene.category === category) &&
      terms.every((term) => index.get(scene.id)!.includes(term)),
  );
}
