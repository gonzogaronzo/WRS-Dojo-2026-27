import { WRS_PHONEME_MAP } from './wrsKnowledgeBase';
import type { WrsSemanticVisualRole } from './wrsVisualTokens';

export interface Part6Tile {
  role: WrsSemanticVisualRole;
  text: string;
}

export interface Part6Group {
  text: string;
  tiles: Part6Tile[];
}

export type Part6RevealAction = 'reveal-all' | 'reveal-next' | 'advance';

/** NFC-normalizes and treats "ȯ" and "ô" as the same sound. For matching only. */
export const normalizePhonemeForMatch = (value: string): string => (
  value.normalize('NFC').trim().replace(/ȯ/g, 'ô')
);

export const phonemesMatch = (a: string, b: string): boolean => (
  normalizePhonemeForMatch(a) === normalizePhonemeForMatch(b)
);

/**
 * Part 6 reveals every spelling with one click; a second click moves on.
 * Part 1 (non-reverse) keeps its one-at-a-time reveal.
 */
export const part6RevealAction = (
  isReverse: boolean,
  revealedCount: number,
  total: number
): Part6RevealAction => {
  if (isReverse) return revealedCount > 0 ? 'advance' : 'reveal-all';
  return revealedCount < total ? 'reveal-next' : 'advance';
};

/** Word-element card role from its dashes. */
export const part6WordElementRole = (text: string): WrsSemanticVisualRole => {
  const starts = text.startsWith('-');
  const ends = text.endsWith('-');
  if (starts && !ends) return 'suffix';
  if (ends && !starts) return 'prefix';
  return 'base-element';
};

interface MapEntry {
  phoneme: string;
  graphemes: string[];
  category: string;
}

const MAP_ENTRIES: MapEntry[] = Object.entries(WRS_PHONEME_MAP).flatMap(([category, entries]) => (
  (entries as Array<{ phoneme: string; graphemes: string[] }>).map(entry => ({
    phoneme: entry.phoneme,
    graphemes: entry.graphemes,
    category
  }))
));

const VOWEL_LETTERS = new Set(['a', 'e', 'i', 'o', 'u']);

const consonantRoleByLength = (length: number): WrsSemanticVisualRole => (
  length <= 1 ? 'consonant' : length === 2 ? 'consonant-digraph' : 'consonant-trigraph'
);

const roleForCategory = (category: string, grapheme: string): WrsSemanticVisualRole => {
  const length = Array.from(grapheme).length;
  if (category === 'Welded Sounds') return 'welded';
  if (category === 'R-Controlled') return 'r-controlled';
  if (category === 'Consonants') return consonantRoleByLength(length);
  return length === 1 ? 'vowel' : 'vowel-team';
};

const roleForGrapheme = (phoneme: string, grapheme: string): WrsSemanticVisualRole => {
  const candidates = MAP_ENTRIES.filter(entry => entry.graphemes.includes(grapheme));
  if (grapheme === 'y') {
    // y is pink as a vowel and ivory as /y/; the prompt phoneme decides.
    return phonemesMatch(phoneme, 'y') ? 'consonant' : 'vowel';
  }
  if (candidates.length > 0) {
    const byPhoneme = candidates.find(entry => phonemesMatch(entry.phoneme, phoneme));
    return roleForCategory((byPhoneme ?? candidates[0]).category, grapheme);
  }
  if (VOWEL_LETTERS.has(grapheme)) return 'vowel';
  return consonantRoleByLength(Array.from(grapheme).length);
};

const DOUBLED_CONSONANT = /^([sflz])\1$/;
const VOWEL_CONSONANT_E = /^([aeiou])-e$/;

/**
 * Turns one Part 6 prompt's responses into display groups. Each group is one
 * spelling option; tiles inside a group sit together. Never splits a spelling
 * with the whole-word tile parser.
 */
export const part6ResponseGroups = (phoneme: string, responses: string[]): Part6Group[] => {
  const seen = new Set<string>();
  const groups: Part6Group[] = [];
  for (const raw of responses) {
    let text = raw.normalize('NFC').trim();
    if (!text) continue;
    const doubled = text.match(DOUBLED_CONSONANT);
    if (doubled) text = doubled[1];
    if (seen.has(text)) continue;
    seen.add(text);

    const vce = text.match(VOWEL_CONSONANT_E);
    groups.push({
      text,
      tiles: vce
        ? [
          { role: 'vowel', text: vce[1] },
          { role: 'consonant', text: '' },
          { role: 'vowel', text: 'e' }
        ]
        : [{ role: roleForGrapheme(phoneme, text), text }]
    });
  }
  return groups;
};
