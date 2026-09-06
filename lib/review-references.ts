import references from '@/data/review-references.json';
import { allEntries, plain } from './content';
const normalize = (value: string) =>
  plain(value)
    .normalize('NFKC')
    .replace(/[\s。、,.!！?？]/g, '');
/** Curated notes take precedence over known model misconceptions in the matching service context. */
export function applyReviewReferences<
  T extends { items: Record<string, unknown>[] },
>(review: T, scene: string): T {
  return {
    ...review,
    items: review.items.map((item) => {
      if (typeof item.original !== 'string') return item;
      const original = item.original;
      const reference = references.find(
        (ref) =>
          ref.scenes.includes(scene) &&
          ref.originals.some((text) => normalize(text) === normalize(original)),
      );
      const entry =
        reference && allEntries.find((entry) => entry.id === reference.entryId);
      if (!reference || !entry) return item;
      return {
        ...item,
        natural: entry.japanese,
        common: entry.japanese,
        why: reference.why,
        written: reference.written,
        overpolite: reference.overpolite,
        underpolite: reference.underpolite,
        stars: reference.stars,
        reference: reference.id,
      };
    }),
  };
}
