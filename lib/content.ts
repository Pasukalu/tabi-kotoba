import visualPhrases from '@/data/visual-phrases.json';
import broadcasts from '@/data/broadcasts.json';
import scenarioPhrases from '@/data/scenario-phrases.json';
import hotel from '@/data/hotel.json';
import booking from '@/data/booking.json';
import restaurant from '@/data/restaurant.json';
import train from '@/data/train.json';
import shinkansen from '@/data/shinkansen.json';
import convenience from '@/data/convenience-store.json';
import payment from '@/data/payment.json';
import life from '@/data/life.json';
import amenities from '@/data/amenities.json';
import phrases from '@/data/phrases.json';
import vocabulary from '@/data/vocabulary.json';
import menu from '@/data/menu.json';
import culture from '@/data/culture.json';
import curriculum from '@/data/curriculum.json';
export type Entry = {
  id: string;
  japanese: string;
  chinese: string;
  kana?: string;
  romaji?: string;
  notes: string;
  scene: string;
  category: string;
  jlpt: string;
  formality: string;
  frequency: number;
  nativeFrequency: string;
  example: string | null;
  audio: string | null;
  pitfalls: string;
  explanation: string;
  rawRisk?: string;
  meat?: string;
  method?: string;
  flavor?: string;
  price?: number;
  components?: { text: string; meaning: string }[];
};
export const lessons: Record<string, Entry[]> = {
  booking,
  hotel,
  restaurant,
  train,
  shinkansen,
  'convenience-store': convenience,
  payment,
  life,
  amenities,
  phrases,
};
export const words = vocabulary as Entry[];
export const menus = menu as Entry[];
export const rules = culture;
export const map = curriculum;
export const allEntries = [
  ...Object.values(lessons).flat(),
  ...words,
  ...menus,
  ...scenarioPhrases,
  ...broadcasts,
  ...visualPhrases,
];
export const names: Record<string, string> = {
  booking: '予約・変更',
  hotel: 'ホテル',
  restaurant: 'レストラン',
  train: '電車・地下鉄',
  shinkansen: '新幹線',
  'convenience-store': 'コンビニ',
  payment: 'お支払い',
  life: '日本生活・予約',
  amenities: 'アメニティ',
  phrases: '日本人っぽい言い方',
};
export function tokens(j: string) {
  return [...j.matchAll(/\[([^|\]]+)\|([^\]]+)\]|([^\[]+)/g)].map((x) => ({
    text: x[1] || x[3],
    reading: x[2] || x[3],
  }));
}
export const plain = (j: string) =>
  tokens(j)
    .map((x) => x.text)
    .join('');
export const kana = (j: string) =>
  tokens(j)
    .map((x) => x.reading)
    .join('');
const table: Record<string, string> = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  を: 'o',
  ん: 'n',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ぁ: 'a',
  ぃ: 'i',
  ぅ: 'u',
  ぇ: 'e',
  ぉ: 'o',
  ゔ: 'vu',
  ゃ: 'ya',
  ゅ: 'yu',
  ょ: 'yo',
};
export function roman(j: string) {
  const parts = tokens(j);
  return parts
    .map((p, index) => {
      let s = p.reading.replace(/[ァ-ヶ]/g, (c) =>
        String.fromCharCode(c.charCodeAt(0) - 96),
      );
      if (
        index > 0 &&
        p.text === p.reading &&
        /^[はへ]/.test(p.text) &&
        parts[index - 1].text !== parts[index - 1].reading
      )
        s = s.replace(/^は/, 'わ').replace(/^へ/, 'え');
      let out = '',
        double = false;
      for (let i = 0; i < s.length; i++) {
        let c = s[i];
        if (c === 'っ') {
          double = true;
          continue;
        }
        if (c === 'ー') {
          out = out.replace(
            /([aeiou])$/,
            (v) => ({ a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' })[v]!,
          );
          continue;
        }
        const ext: Record<string, string> = {
          てぃ: 'ti',
          でぃ: 'di',
          とぅ: 'tu',
          どぅ: 'du',
          ふぁ: 'fa',
          ふぃ: 'fi',
          ふぇ: 'fe',
          ふぉ: 'fo',
          うぃ: 'wi',
          うぇ: 'we',
          うぉ: 'wo',
          しぇ: 'she',
          じぇ: 'je',
          ちぇ: 'che',
          ゔぁ: 'va',
          ゔぃ: 'vi',
          ゔぇ: 've',
          ゔぉ: 'vo',
        };
        const pair = c + (s[i + 1] || '');
        let r = ext[pair] || table[c] || c;
        if (ext[pair]) i++;
        if (/[ゃゅょ]/.test(s[i + 1] || '') && r.endsWith('i')) {
          r =
            r.slice(0, -1) +
            (r === 'shi' || r === 'chi' || r === 'ji' ? '' : 'y') +
            ({ ゃ: 'a', ゅ: 'u', ょ: 'o' }[s[++i]] || '');
        }
        if (c === 'ん' && /[あいうえおやゆよ]/.test(s[i + 1] || '')) r = "n'";
        out += (double ? (r.startsWith('ch') ? 't' : r[0]) : '') + r;
        double = false;
      }
      return out.replace(/ou/g, 'ō').replace(/uu/g, 'ū');
    })
    .join(' ')
    .replace(/ 、/g, ', ')
    .replace(/。/g, '.')
    .replace(/？/g, '?');
}
export function searchEntries(q: string, items = allEntries) {
  const normalize = (v: string) =>
    v
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 96))
      .replace(
        /[ōūāīē]/g,
        (c) => ({ ō: 'ou', ū: 'uu', ā: 'aa', ī: 'ii', ē: 'ee' })[c]!,
      )
      .replace(/\s/g, '');
  const k = normalize(q);
  return items.filter((e) =>
    normalize(
      [
        plain(e.japanese),
        kana(e.japanese),
        roman(e.japanese),
        e.chinese,
        e.notes,
        names[e.scene],
      ].join(' '),
    ).includes(k),
  );
}
