import step2 from './wordBank/step2.json';
import { Lesson, StudentProfile } from './types';
import { generateId, shuffleArray } from './utils';
import type { WordInstance } from './wordDistribution';

/**
 * Part 4 charting from the Student Reader word-list pages.
 *
 * Every word carries its substep, Wilson vocabulary level (AB / A / B, read
 * from the page footer; split pages are top 15 / bottom 15), real or nonsense,
 * and its printed Reader page. A lesson names a substep, a group level, and a
 * word type; the app deals 15 different words to each student.
 */

export type ChartingLevel = 'AB' | 'A' | 'B';
export type ChartingWordType = 'real' | 'nonsense';

export const CHARTING_LEVELS: ChartingLevel[] = ['AB', 'A', 'B'];
export const CHARTING_WORDS_PER_STUDENT = 15;

interface BankWord {
  w: string;
  s: string;
  l: ChartingLevel | null;
  t: 'real' | 'nonsense' | 'latin-base';
  p: number;
}

interface BankFile {
  version: 1;
  reader: string;
  step: number;
  words: BankWord[];
}

const BANKS: BankFile[] = [step2 as BankFile];

export interface ChartingPlan {
  substep: string;
  level: ChartingLevel;
  type: ChartingWordType;
  /** Per-student level overrides from the lesson, keyed by student name. */
  studentLevels: Record<string, ChartingLevel>;
  /** Hand-picked lists from the lesson, keyed by student name. */
  studentLists: Array<{ student: string; words: string[] }>;
}

const isLevel = (value: unknown): value is ChartingLevel => value === 'AB' || value === 'A' || value === 'B';

const bankFor = (substep: string) => BANKS.find(bank => substep.startsWith(`${bank.step}.`));

/** Substeps the word bank can deal from, in order. */
export const chartingBankSubsteps = (): string[] => {
  const substeps = new Set(BANKS.flatMap(bank => bank.words.map(word => word.s)));
  return [...substeps].sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]) || a.localeCompare(b));
};

export const chartingBankHasType = (substep: string, type: ChartingWordType): boolean => (
  Boolean(bankFor(substep)?.words.some(word => word.s === substep && word.t === type))
);

export const chartingReaderFor = (substep: string): string | undefined => bankFor(substep)?.reader;

/**
 * Unique words a student at this level may be dealt. Every level includes AB
 * words (Wilson: AB words for all students, A or B added for individual focus).
 * Nonsense words carry no vocabulary level.
 */
export const chartingPool = (substep: string, type: ChartingWordType, level: ChartingLevel): string[] => {
  const words = bankFor(substep)?.words || [];
  const pool = new Set<string>();
  words.forEach(word => {
    if (word.s !== substep || word.t !== type) return;
    if (type === 'real' && word.l !== 'AB' && word.l !== level) return;
    pool.add(word.w);
  });
  return [...pool];
};

/** Reads the charting plan from a runtime Part 4 `data` object. */
export const chartingPlanFromPart4Data = (value: unknown): ChartingPlan | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.chartingPlanned === false) return null;
  const source = data.chartingSource as Record<string, unknown> | undefined;
  if (!source || typeof source.substep !== 'string' || !isLevel(source.level)) return null;
  const substep = source.substep.trim();
  if (!bankFor(substep)) return null;
  const type: ChartingWordType = data.chartingType === 'nonsense' ? 'nonsense' : 'real';

  const studentLevels: Record<string, ChartingLevel> = {};
  const rawLevels = data.studentLevels;
  if (rawLevels && typeof rawLevels === 'object' && !Array.isArray(rawLevels)) {
    Object.entries(rawLevels as Record<string, unknown>).forEach(([name, level]) => {
      if (name.trim() && isLevel(level)) studentLevels[name.trim()] = level;
    });
  }

  const studentLists = Array.isArray(data.studentLists)
    ? data.studentLists.flatMap(entry => {
      if (!entry || typeof entry !== 'object') return [];
      const { student, words } = entry as Record<string, unknown>;
      if (typeof student !== 'string' || !student.trim() || !Array.isArray(words)) return [];
      const clean = words.filter((word): word is string => typeof word === 'string' && Boolean(word.trim())).map(word => word.trim());
      return clean.length ? [{ student: student.trim(), words: clean }] : [];
    })
    : [];

  return { substep, level: source.level, type, studentLevels, studentLists };
};

export const chartingPlanForLesson = (lesson: Lesson | null | undefined): ChartingPlan | null => {
  const part4 = lesson?.runtimePlan?.parts?.find(part => part.part === 4);
  return chartingPlanFromPart4Data(part4?.data);
};

const nameKey = (name: string) => name.trim().toLocaleLowerCase();
const firstName = (name: string) => nameKey(name).split(/\s+/)[0] || '';

/**
 * Finds the lesson entry meant for this student: an exact name match first,
 * otherwise a first-name match when exactly one entry has that first name.
 */
export const matchStudentName = <T>(entries: Array<[string, T]>, studentName: string): T | undefined => {
  const exact = entries.find(([name]) => nameKey(name) === nameKey(studentName));
  if (exact) return exact[1];
  const first = firstName(studentName);
  const byFirst = entries.filter(([name]) => firstName(name) === first);
  return byFirst.length === 1 ? byFirst[0][1] : undefined;
};

export const handPickedListFor = (plan: ChartingPlan, studentName: string): string[] | undefined => (
  matchStudentName(plan.studentLists.map(entry => [entry.student, entry.words] as [string, string[]]), studentName)
);

export const planLevelFor = (plan: ChartingPlan, studentName: string): ChartingLevel => (
  matchStudentName(Object.entries(plan.studentLevels), studentName) ?? plan.level
);

export interface ChartingDealSettings {
  substep: string;
  type: ChartingWordType;
  /** Level for each student, in the same order as `students`. */
  levels: ChartingLevel[];
  /** Hand-picked words for each student, in the same order; undefined deals from the bank. */
  handPicked: Array<string[] | undefined>;
}

export const defaultDealSettings = (plan: ChartingPlan, students: Array<Pick<StudentProfile, 'name'>>): ChartingDealSettings => ({
  substep: plan.substep,
  type: plan.type,
  levels: students.map(student => planLevelFor(plan, student.name)),
  handPicked: students.map(student => handPickedListFor(plan, student.name))
});

/**
 * Deals each student 15 words. Students get different words while the pool
 * allows; when it runs short, words are shared rather than lists cut short.
 */
export const dealLeveledCharting = (
  settings: ChartingDealSettings,
  shuffle: <T>(items: T[]) => T[] = shuffleArray,
  createId: () => string = generateId
): WordInstance[][] => {
  const used = new Set<string>();
  const wordType = settings.type === 'nonsense' ? 'nonsense' as const : 'regular' as const;
  return settings.levels.map((level, index) => {
    const picked = settings.handPicked[index];
    let words: string[];
    if (picked && picked.length) {
      words = picked.slice(0, CHARTING_WORDS_PER_STUDENT);
    } else {
      const pool = chartingPool(settings.substep, settings.type, level);
      const fresh = shuffle(pool.filter(word => !used.has(word)));
      words = fresh.slice(0, CHARTING_WORDS_PER_STUDENT);
      if (words.length < CHARTING_WORDS_PER_STUDENT) {
        const chosen = new Set(words);
        const shared = shuffle(pool.filter(word => !chosen.has(word)));
        words = [...words, ...shared.slice(0, CHARTING_WORDS_PER_STUDENT - words.length)];
      }
    }
    words.forEach(word => used.add(word));
    return words.map(word => ({ id: `bank-${settings.substep}-${word}`, text: word, type: wordType, instanceId: createId() }));
  });
};

/** How many words appear on more than one student's list. */
export const sharedWordCount = (distribution: WordInstance[][]): number => {
  const counts = new Map<string, number>();
  distribution.forEach(list => new Set(list.map(word => word.text)).forEach(text => counts.set(text, (counts.get(text) || 0) + 1)));
  return [...counts.values()].filter(count => count > 1).length;
};
