import type { LessonFocus, Slide } from './types';

type UnknownRecord = Record<string, unknown>;

export type Part2PresentationProvenance =
  | 'source-verbatim'
  | 'source-paraphrase'
  | 'teacher-created';

export type Part2TileRole =
  | 'consonant'
  | 'vowel'
  | 'consonant-digraph'
  | 'vowel-team'
  | 'welded'
  | 'r-controlled'
  | 'prefix'
  | 'suffix'
  | 'base-element'
  | 'greek-combining-form';

export interface Part2PresentationTile {
  text: string;
  role: Part2TileRole;
}

export interface Part2WordElement {
  text: string;
  role: 'prefix' | 'suffix' | 'base-element' | 'greek-combining-form';
}

interface Part2FrameBase {
  id: string;
  title?: string;
  annotation?: string;
  teacherCue?: string;
  provenance?: Part2PresentationProvenance;
  sourceIds?: string[];
}

export interface Part2TileRowFrame extends Part2FrameBase {
  kind: 'tile-row';
  tiles: Part2PresentationTile[];
}

export interface Part2SyllableRowFrame extends Part2FrameBase {
  kind: 'syllable-row';
  syllables: string[];
}

export interface Part2WordElementsFrame extends Part2FrameBase {
  kind: 'word-elements';
  elements: Part2WordElement[];
}

export interface Part2WordChangeFrame extends Part2FrameBase {
  kind: 'word-change';
  before: Part2PresentationTile[];
  after: Part2PresentationTile[];
}

export interface Part2ContrastFrame extends Part2FrameBase {
  kind: 'contrast';
  left: Part2PresentationTile[];
  right: Part2PresentationTile[];
}

export interface Part2ExplanationFrame extends Part2FrameBase {
  kind: 'explanation';
  text: string;
}

export interface Part2NotebookFrame extends Part2FrameBase {
  kind: 'notebook';
  text: string;
  section?: string;
}

export interface Part2InvalidFrame extends Part2FrameBase {
  kind: 'invalid';
  reason: string;
}

export type Part2PresentationFrame =
  | Part2TileRowFrame
  | Part2SyllableRowFrame
  | Part2WordElementsFrame
  | Part2WordChangeFrame
  | Part2ContrastFrame
  | Part2ExplanationFrame
  | Part2NotebookFrame
  | Part2InvalidFrame;

export interface Part2PresentationV1 {
  version: 1;
  focus?: LessonFocus;
  frames: Part2PresentationFrame[];
}

const TILE_ROLES = new Set<Part2TileRole>([
  'consonant', 'vowel', 'consonant-digraph', 'vowel-team', 'welded',
  'r-controlled', 'prefix', 'suffix', 'base-element', 'greek-combining-form'
]);

const ELEMENT_ROLES = new Set<Part2WordElement['role']>([
  'prefix', 'suffix', 'base-element', 'greek-combining-form'
]);

const PROVENANCE_VALUES = new Set<Part2PresentationProvenance>([
  'source-verbatim', 'source-paraphrase', 'teacher-created'
]);

const FOCUS_VALUES = new Set<LessonFocus>([
  'introduction', 'accuracy', 'automaticity-fluency', 'mixed'
]);

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const nonEmptyText = (value: unknown): string | null => (
  typeof value === 'string' && value.trim().length > 0 ? value : null
);

const optionalText = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim().length > 0 ? value : undefined
);

const invalidFrame = (id: string, reason: string): Part2InvalidFrame => ({
  id,
  kind: 'invalid',
  reason
});

const normalizeBase = (record: UnknownRecord, index: number): Part2FrameBase | Part2InvalidFrame => {
  const id = nonEmptyText(record.id);
  if (!id) return invalidFrame(`invalid-${index + 1}`, 'Frame id is missing.');

  if (record.provenance !== undefined && !PROVENANCE_VALUES.has(record.provenance as Part2PresentationProvenance)) {
    return invalidFrame(id, 'Frame provenance is not recognized.');
  }

  if (record.sourceIds !== undefined && (
    !Array.isArray(record.sourceIds) ||
    record.sourceIds.some(sourceId => typeof sourceId !== 'string' || sourceId.trim().length === 0)
  )) {
    return invalidFrame(id, 'Frame sourceIds must be non-empty strings.');
  }

  return {
    id,
    title: optionalText(record.title),
    annotation: optionalText(record.annotation),
    teacherCue: optionalText(record.teacherCue),
    provenance: record.provenance as Part2PresentationProvenance | undefined,
    sourceIds: Array.isArray(record.sourceIds) ? record.sourceIds as string[] : undefined
  };
};

const normalizeTiles = (value: unknown): Part2PresentationTile[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const tiles: Part2PresentationTile[] = [];
  for (const candidate of value) {
    const record = asRecord(candidate);
    const text = nonEmptyText(record?.text);
    const role = record?.role as Part2TileRole | undefined;
    if (!record || !text || !role || !TILE_ROLES.has(role)) return null;
    tiles.push({ text, role });
  }
  return tiles;
};

const normalizeElements = (value: unknown): Part2WordElement[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const elements: Part2WordElement[] = [];
  for (const candidate of value) {
    const record = asRecord(candidate);
    const text = nonEmptyText(record?.text);
    const role = record?.role as Part2WordElement['role'] | undefined;
    if (!record || !text || !role || !ELEMENT_ROLES.has(role)) return null;
    elements.push({ text, role });
  }
  return elements;
};

const normalizeFrame = (value: unknown, index: number): Part2PresentationFrame => {
  const record = asRecord(value);
  if (!record) return invalidFrame(`invalid-${index + 1}`, 'Frame must be an object.');

  const base = normalizeBase(record, index);
  if (base.kind === 'invalid') return base;

  switch (record.kind) {
    case 'tile-row': {
      const tiles = normalizeTiles(record.tiles);
      return tiles ? { ...base, kind: 'tile-row', tiles } : invalidFrame(base.id, 'tile-row requires explicit tiles.');
    }
    case 'syllable-row': {
      if (!Array.isArray(record.syllables) || record.syllables.length === 0 ||
          record.syllables.some(value => typeof value !== 'string' || value.trim().length === 0)) {
        return invalidFrame(base.id, 'syllable-row requires explicit syllables.');
      }
      return { ...base, kind: 'syllable-row', syllables: record.syllables as string[] };
    }
    case 'word-elements': {
      const elements = normalizeElements(record.elements);
      return elements ? { ...base, kind: 'word-elements', elements } : invalidFrame(base.id, 'word-elements requires explicit word elements.');
    }
    case 'word-change': {
      const before = normalizeTiles(record.before);
      const after = normalizeTiles(record.after);
      return before && after
        ? { ...base, kind: 'word-change', before, after }
        : invalidFrame(base.id, 'word-change requires explicit before and after tiles.');
    }
    case 'contrast': {
      const left = normalizeTiles(record.left);
      const right = normalizeTiles(record.right);
      return left && right
        ? { ...base, kind: 'contrast', left, right }
        : invalidFrame(base.id, 'contrast requires explicit left and right tiles.');
    }
    case 'explanation': {
      const text = nonEmptyText(record.text);
      return text ? { ...base, kind: 'explanation', text } : invalidFrame(base.id, 'explanation requires supplied text.');
    }
    case 'notebook': {
      const text = nonEmptyText(record.text);
      return text
        ? { ...base, kind: 'notebook', text, section: optionalText(record.section) }
        : invalidFrame(base.id, 'notebook requires supplied text.');
    }
    default:
      return invalidFrame(base.id, `Unknown Part 2 frame kind: ${String(record.kind || 'missing')}.`);
  }
};

export const normalizePart2Presentation = (value: unknown): Part2PresentationV1 => {
  const record = asRecord(value);
  if (!record || record.version !== 1) {
    return {
      version: 1,
      frames: [invalidFrame('invalid-presentation', 'Part 2 presentation version is missing or unsupported.')]
    };
  }

  if (record.focus !== undefined && !FOCUS_VALUES.has(record.focus as LessonFocus)) {
    return {
      version: 1,
      frames: [invalidFrame('invalid-presentation', 'Part 2 presentation focus is not recognized.')]
    };
  }

  if (!Array.isArray(record.frames) || record.frames.length === 0) {
    return {
      version: 1,
      focus: record.focus as LessonFocus | undefined,
      frames: [invalidFrame('invalid-presentation', 'Part 2 presentation contains no frames.')]
    };
  }

  return {
    version: 1,
    focus: record.focus as LessonFocus | undefined,
    frames: record.frames.map(normalizeFrame)
  };
};

const semanticUnit = (role: string, text: string) => (
  `|§p2:${role}:${encodeURIComponent(text)}|`
);

const encodeTile = (tile: Part2PresentationTile) => semanticUnit(tile.role, tile.text);
const encodeTiles = (tiles: Part2PresentationTile[]) => tiles.map(encodeTile).join(' ');
const annotationElements = (frame: Part2FrameBase): Slide['elements'] => frame.annotation
  ? [{ id: `${frame.id}-annotation`, type: 'text', content: frame.annotation }]
  : [];

const safeUnavailableSlide = (frame: Part2InvalidFrame): Slide => ({
  id: `part2-${frame.id}`,
  type: 'template',
  title: frame.title || '',
  content: semanticUnit('statement', 'Instructional display unavailable.'),
  elements: [],
  notes: `Part 2 frame unavailable: ${frame.reason}`
});

const frameToSlide = (frame: Part2PresentationFrame): Slide => {
  if (frame.kind === 'invalid') return safeUnavailableSlide(frame);

  let content = '';
  let title = frame.title || '';

  switch (frame.kind) {
    case 'tile-row':
      content = encodeTiles(frame.tiles);
      break;
    case 'syllable-row':
      content = frame.syllables.map(syllable => semanticUnit('syllable', syllable)).join(' ');
      break;
    case 'word-elements':
      content = frame.elements.map(element => semanticUnit(element.role, element.text)).join(' ');
      break;
    case 'word-change':
      content = `${encodeTiles(frame.before)} ${semanticUnit('symbol', '→')} ${encodeTiles(frame.after)}`;
      break;
    case 'contrast':
      content = `${encodeTiles(frame.left)} ${semanticUnit('divider', '')} ${encodeTiles(frame.right)}`;
      break;
    case 'explanation':
      content = semanticUnit('statement', frame.text);
      break;
    case 'notebook':
      content = semanticUnit('notebook', frame.text);
      if (!title && frame.section) title = frame.section;
      break;
  }

  return {
    id: `part2-${frame.id}`,
    type: 'template',
    title,
    content,
    elements: annotationElements(frame),
    notes: frame.teacherCue
  };
};

/**
 * Returns null only when no semantic Part 2 presentation was supplied.
 * If a presentation is present but malformed, it becomes a safe unavailable
 * frame rather than falling back to invented or heuristic instructional content.
 */
export const part2PresentationToSlides = (partData: unknown): Slide[] | null => {
  const data = asRecord(partData);
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'part2Presentation')) return null;
  const presentation = normalizePart2Presentation(data.part2Presentation);
  return presentation.frames.map(frameToSlide);
};
