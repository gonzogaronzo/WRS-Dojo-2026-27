import part1 from './wordElementReviewDeckData/part1';
import part2 from './wordElementReviewDeckData/part2';
import part3 from './wordElementReviewDeckData/part3';
import part4 from './wordElementReviewDeckData/part4';
import part5 from './wordElementReviewDeckData/part5';
import part6 from './wordElementReviewDeckData/part6';
import part7 from './wordElementReviewDeckData/part7';

export type WordElementFamily = 'Latin' | 'Greek';

export interface WordElementReviewCard {
  id: string;
  family: WordElementFamily;
  elements: readonly string[];
  related: readonly string[];
  meaning: string;
  example: string;
  firstTaught: string;
  notebookCategory: string;
  sourceVolume: string;
  sourcePage: number;
  order: number;
  atlasCol: number;
  atlasRow: number;
}

export const WORD_ELEMENT_ATLAS = {
  cols: 10,
  rows: 9,
  endpoint: 'https://us-central1-wrs-firebase.cloudfunctions.net/serveWordElementMnemonicAtlas'
} as const;

export const WORD_ELEMENT_REVIEW_CARDS: readonly WordElementReviewCard[] = [
  ...part1, ...part2, ...part3, ...part4, ...part5, ...part6, ...part7
] as readonly WordElementReviewCard[];

export function substepKey(value: string): number {
  const match = String(value || '').trim().match(/^(\d+)(?:\.(\d+))?/);
  return match ? Number(match[1]) * 100 + Number(match[2] || 0) : Number.POSITIVE_INFINITY;
}

export const WORD_ELEMENT_REVIEW_SUBSTEPS = Array.from(
  new Set(WORD_ELEMENT_REVIEW_CARDS.map(card => card.firstTaught))
).sort((a, b) => substepKey(a) - substepKey(b));

export function cardsForWordElementReview(options: {
  family?: WordElementFamily | 'All';
  scope?: 'all' | 'through' | 'current';
  targetSubstep?: string;
} = {}): WordElementReviewCard[] {
  const family = options.family || 'All';
  const scope = options.scope || 'all';
  const target = String(options.targetSubstep || '').trim();
  const targetKey = substepKey(target);
  return WORD_ELEMENT_REVIEW_CARDS
    .filter(card => family === 'All' || card.family === family)
    .filter(card => {
      if (scope === 'all') return true;
      if (!target || !Number.isFinite(targetKey)) return false;
      if (scope === 'current') return card.firstTaught === target;
      return substepKey(card.firstTaught) <= targetKey;
    })
    .sort((a, b) => a.order - b.order);
}

export const cardElementLabel = (card: WordElementReviewCard): string => card.elements.join(' / ');

export const WORD_ELEMENT_REVIEW_SOURCE_NOTE =
  'Element, meaning, example, related-base, Substep, and mnemonic-image content are transcribed/cropped from supplied Wilson Student Notebook Answer Key sources. The review interface, filters, flip behavior, and study modes are teacher-created.';
