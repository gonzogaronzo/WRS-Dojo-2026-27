import { Lesson, WordCard } from './types';
import { generateId, shuffleArray } from './utils';

export interface WordInstance extends WordCard {
  instanceId: string;
}

type ShuffleCards = (cards: WordCard[]) => WordCard[];
type CreateId = () => string;

export const uniqueWordCards = (cards: WordCard[]): WordCard[] => {
  const seen = new Set<string>();
  return cards.filter(card => {
    const key = card.text.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Part 4 charting is always 15 words per student. The card pool may be much larger
// so each student can receive a different 15-word list without repeats across students.
export const targetWordCount = (_cards: WordCard[]): number => 15;

export const chartingWordCardsForLesson = (lesson: Lesson): WordCard[] => {
  const explicitChartingPool = (lesson.wordListCharting || []).map((text, index) => ({
    id: `charting-${index}`,
    text,
    type: 'regular' as const
  }));
  if (explicitChartingPool.length > 0) return explicitChartingPool;

  const wordCardPool = (lesson.wordCards || []).filter((card): card is WordCard => Boolean(card?.id));
  const manualPool = (lesson.wordListReading || []).map((text, index) => ({
    id: `custom-${index}`,
    text,
    type: 'regular' as const
  }));

  if ((lesson.wordListReadingAuto ?? true) && wordCardPool.length > 0) return wordCardPool;
  if (manualPool.length > 0) return manualPool;

  const dictationPool: WordCard[] = [];
  (lesson.dictation?.realWords || []).forEach((text, index) => {
    dictationPool.push({ id: `dict-real-${index}`, text, type: 'regular' });
  });
  (lesson.dictation?.nonsenseWords || []).forEach((text, index) => {
    dictationPool.push({ id: `dict-non-${index}`, text, type: 'nonsense' });
  });
  (lesson.dictation?.wordElements || []).forEach((text, index) => {
    dictationPool.push({ id: `dict-elem-${index}`, text, type: 'regular' });
  });

  return dictationPool.length > 0 ? dictationPool : wordCardPool;
};

export const normalizeWordDistribution = (value: unknown): WordInstance[][] => {
  if (!Array.isArray(value)) return [];
  return value.filter(Array.isArray).map((studentList, studentIndex) => (
    studentList.flatMap((entry, wordIndex) => {
      if (!entry || typeof entry !== 'object') return [];
      const candidate = entry as Partial<WordInstance>;
      if (typeof candidate.text !== 'string' || !candidate.text.trim()) return [];
      const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : `word-${studentIndex}-${wordIndex}`;
      const instanceId = typeof candidate.instanceId === 'string' && candidate.instanceId
        ? candidate.instanceId
        : `${id}-${studentIndex}-${wordIndex}`;
      const type = candidate.type === 'nonsense' || candidate.type === 'hfw' || candidate.type === 'oops'
        ? candidate.type
        : 'regular';
      return [{ id, instanceId, text: candidate.text, type }];
    })
  ));
};

export const hasCompleteWordDistribution = (
  distribution: WordInstance[][],
  studentCount: number,
  wordsPerStudent: number
): boolean => (
  studentCount > 0 &&
  distribution.length === studentCount &&
  distribution.every(studentList => Array.isArray(studentList) && studentList.length === wordsPerStudent)
);

export const buildWordDistribution = (
  cards: WordCard[],
  studentCount: number,
  wordsPerStudent: number,
  shuffleCards: ShuffleCards = shuffleArray,
  createId: CreateId = generateId
): WordInstance[][] => {
  const uniqueCards = shuffleCards(uniqueWordCards(cards));
  if (studentCount <= 0 || wordsPerStudent <= 0 || uniqueCards.length === 0) return [];

  const startSpacing = Math.max(1, Math.floor(uniqueCards.length / studentCount));

  return Array.from({ length: studentCount }, (_, studentIndex) => {
    const start = (studentIndex * startSpacing) % uniqueCards.length;
    return Array.from({ length: wordsPerStudent }, (_, wordIndex) => ({
      ...uniqueCards[(start + wordIndex) % uniqueCards.length],
      instanceId: createId()
    }));
  });
};
