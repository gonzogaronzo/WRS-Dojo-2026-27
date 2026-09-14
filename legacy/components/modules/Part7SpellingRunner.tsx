import React from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Volume2 } from 'lucide-react';
import Tile from '../Tile';
import { encodePart2SemanticUnit } from '../../part2Presentation';

type Part7UnitRole =
  | 'consonant'
  | 'consonant-digraph'
  | 'consonant-trigraph'
  | 'vowel'
  | 'vowel-team'
  | 'r-controlled'
  | 'welded'
  | 'syllable'
  | 'prefix'
  | 'suffix'
  | 'base-element'
  | 'greek-combining-form';

type Part7Representation =
  | 'letter-sound-tiles'
  | 'syllable-cards'
  | 'prefix-suffix-cards'
  | 'word-element-cards';

export interface Part7SpellingUnit {
  text: string;
  role: Part7UnitRole;
}

export interface Part7SpellingItem {
  id: string;
  /** Teacher-private target; blank only in the sanitized student projection. */
  word: string;
  group: 'review' | 'current' | 'word-element';
  representation: Part7Representation;
  units: Part7SpellingUnit[];
  teacherCue?: string;
}

interface Part7SpellingRunnerProps {
  items: Part7SpellingItem[];
  activeIndex?: number;
  onUpdateActiveIndex?: (index: number) => void;
  revealedItems?: Record<number, unknown>;
  onUpdateRevealedItems?: (items: Record<number, unknown>) => void;
  readOnly?: boolean;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const roles = new Set<Part7UnitRole>([
  'consonant', 'consonant-digraph', 'consonant-trigraph', 'vowel', 'vowel-team',
  'r-controlled', 'welded', 'syllable', 'prefix', 'suffix', 'base-element', 'greek-combining-form'
]);

const representations = new Set<Part7Representation>([
  'letter-sound-tiles', 'syllable-cards', 'prefix-suffix-cards', 'word-element-cards'
]);

const tileRoles = new Set<Part7UnitRole>([
  'consonant', 'consonant-digraph', 'consonant-trigraph', 'vowel', 'vowel-team', 'r-controlled', 'welded'
]);

const representationMatchesUnits = (representation: Part7Representation, units: Part7SpellingUnit[]) => {
  const unitRoles = units.map(unit => unit.role);
  switch (representation) {
    case 'letter-sound-tiles':
      return unitRoles.every(role => tileRoles.has(role));
    case 'syllable-cards':
      return unitRoles.every(role => role === 'syllable');
    case 'prefix-suffix-cards':
      return unitRoles.some(role => role === 'prefix' || role === 'suffix') &&
        unitRoles.every(role => tileRoles.has(role) || role === 'syllable' || role === 'prefix' || role === 'suffix');
    case 'word-element-cards':
      return unitRoles.every(role => role === 'base-element' || role === 'greek-combining-form');
  }
};

/**
 * Canonical Part 7 is source-specified, never spelling-inferred. If the lesson
 * does not explicitly supply a valid representation, the simple runner is not
 * activated and the caller may use the legacy spelling surface instead.
 */
export const part7SpellingItemsFromData = (value: unknown): Part7SpellingItem[] | null => {
  const data = asRecord(value);
  if (!data || !Array.isArray(data.spellingItems) || data.spellingItems.length === 0) return null;
  const studentProjection = data.studentProjection === true;

  const seenIds = new Set<string>();
  const normalized: Part7SpellingItem[] = [];

  for (const candidate of data.spellingItems) {
    const record = asRecord(candidate);
    const id = text(record?.id);
    const word = text(record?.word);
    const group = record?.group;
    const representation = record?.representation as Part7Representation | undefined;
    if (
      !record || !id || (!studentProjection && !word) || seenIds.has(id) ||
      (group !== 'review' && group !== 'current' && group !== 'word-element') ||
      !representation || !representations.has(representation) ||
      !Array.isArray(record.units) || record.units.length === 0
    ) return null;

    const units: Part7SpellingUnit[] = [];
    for (const rawUnit of record.units) {
      const unit = asRecord(rawUnit);
      const unitText = text(unit?.text);
      const role = unit?.role as Part7UnitRole | undefined;
      if (!unit || !unitText || !role || !roles.has(role)) return null;
      if (role === 'prefix' && !unitText.endsWith('-')) return null;
      if (role === 'suffix' && !unitText.startsWith('-')) return null;
      units.push({ text: unitText, role });
    }

    if (!representationMatchesUnits(representation, units)) return null;

    seenIds.add(id);
    normalized.push({
      id,
      word: studentProjection ? '' : word,
      group,
      representation,
      units,
      teacherCue: studentProjection ? undefined : (text(record.teacherCue) || undefined)
    });
  }

  return normalized;
};

/**
 * Presenter/student payload for Part 7. It carries only what the passive board
 * needs to reveal the supplied cards. The target spelling and teacher cue never
 * cross the teacher/student boundary.
 */
export const sanitizePart7SpellingDataForStudent = (value: unknown): UnknownRecord | undefined => {
  const items = part7SpellingItemsFromData(value);
  if (!items) return undefined;
  return {
    studentProjection: true,
    spellingItems: items.map(item => ({
      id: item.id,
      group: item.group,
      representation: item.representation,
      units: item.units
    }))
  };
};

const unitTile = (unit: Part7SpellingUnit) => ({
  text: encodePart2SemanticUnit(unit.role, unit.text),
  type: 'syllable' as const
});

const groupLabel = (group: Part7SpellingItem['group']) => {
  if (group === 'review') return 'Review word';
  if (group === 'current') return 'Current word';
  return 'Word Element';
};

const Part7SpellingRunner: React.FC<Part7SpellingRunnerProps> = ({
  items,
  activeIndex = 0,
  onUpdateActiveIndex,
  revealedItems = {},
  onUpdateRevealedItems,
  readOnly = false
}) => {
  const index = Math.max(0, Math.min(items.length - 1, activeIndex));
  const item = items[index];
  const revealed = Boolean(revealedItems[index]);

  const setIndex = (next: number) => {
    if (readOnly) return;
    onUpdateActiveIndex?.(Math.max(0, Math.min(items.length - 1, next)));
  };

  const setRevealed = (next: boolean) => {
    if (readOnly) return;
    const updated = { ...revealedItems };
    if (next) updated[index] = true;
    else delete updated[index];
    onUpdateRevealedItems?.(updated);
  };

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-stone-500 font-semibold">
        Part 7 spelling display unavailable.
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#fcfbf9] text-stone-900 flex flex-col" data-part7-spelling-runner>
      <div className="h-20 shrink-0 border-b border-stone-200 bg-white px-8 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-800">Part 7 · Spelling</div>
          <div className="mt-1 text-sm font-bold text-stone-500">Dictate → Reveal → Next</div>
        </div>
        {!readOnly && (
          <div data-part7-target-private className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-right shadow-sm">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">{groupLabel(item.group)} · teacher only</div>
            <div className="text-2xl font-black text-stone-900">{item.word}</div>
            {item.teacherCue ? <div className="mt-1 max-w-[34rem] text-xs font-semibold text-stone-600">{item.teacherCue}</div> : null}
          </div>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-12 py-10">
        {revealed ? (
          <div data-part7-revealed="true" className="flex max-w-[1120px] flex-wrap items-center justify-center gap-4">
            {item.units.map((unit, unitIndex) => (
              <Tile key={`${item.id}-${unitIndex}`} data={unitTile(unit)} size="2xl" />
            ))}
          </div>
        ) : (
          <div data-part7-revealed="false" className="flex flex-col items-center justify-center text-center">
            <Volume2 className="h-16 w-16 text-stone-300" />
            <div className="mt-5 text-5xl font-black font-serif text-stone-800">Listen</div>
            <div className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-stone-400">
              {readOnly ? 'Wait for the teacher to reveal the spelling.' : 'Student display is hiding the answer.'}
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="h-24 shrink-0 border-t border-stone-200 bg-white px-8 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous spelling item"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-stone-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-stone-400">{index + 1} / {items.length}</span>
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-red-900"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealed ? 'Hide' : 'Reveal'}
            </button>
          </div>

          <button
            type="button"
            aria-label="Next spelling item"
            disabled={index === items.length - 1}
            onClick={() => setIndex(index + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-stone-600 disabled:opacity-30"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Part7SpellingRunner;
