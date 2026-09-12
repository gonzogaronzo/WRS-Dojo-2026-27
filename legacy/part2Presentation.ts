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
  | 'consonant-trigraph'
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

export type Part2BuildUnitRole = Part2TileRole | 'word' | 'syllable';

export interface Part2BuildUnit {
  text: string;
  role: Part2BuildUnitRole;
}

export interface Part2BuildStep {
  label?: string;
  units: Part2BuildUnit[];
}

/**
 * Source-driven Part 2 runner schema. Action describes the instructional move;
 * displayType describes the supplied physical/manipulative representation.
 * They intentionally remain separate so the renderer never guesses structure
 * from a spelling string.
 */
export type Part2ActionType =
  | 'REVIEW_BUILD'
  | 'TEACH_CARD'
  | 'BUILD_WORD'
  | 'PRACTICE_BUILD'
  | 'READ_WORDS'
  | 'MARK_WORDS'
  | 'NOTEBOOK'
  | 'AFFIX_MANIPULATION'
  | 'WORD_ELEMENT_BUILD';

export type Part2DisplayType =
  | 'LETTER_SOUND_TILES'
  | 'SYLLABLE_CARDS'
  | 'PREFIX_SUFFIX_CARDS'
  | 'WORD_ELEMENT_CARDS'
  | 'WRITTEN_WORD'
  | 'NOTEBOOK'
  | 'MIXED_SOURCE_CARDS';

export type Part2InstructionObjectRole = Part2BuildUnitRole | 'notebook' | 'statement';

/**
 * Objects are movable by default. A source/compiler may mark an object static
 * only when the instructional move intentionally requires a fixed surface.
 */
export type Part2InstructionObjectInteraction = 'movable' | 'static';

/** Source/compiler-owned staging: mobility does not imply a pull stack. */
export type Part2InstructionLayout = 'pull-stack' | 'review-row' | 'single-card' | 'notebook-page';

export interface Part2InstructionObject {
  id: string;
  text: string;
  role: Part2InstructionObjectRole;
  /** Required for build/manipulation moves; source order begins at 1. */
  stagingOrder?: number;
  /** Explicit opt-out from the teacher work-surface drag interaction. */
  interaction?: Part2InstructionObjectInteraction;
}

/**
 * The compiler/source owns this classification. It lets the runner reject a
 * raw-word fallback instead of trying to infer syllables or morphology.
 */
export type Part2CardRepresentation =
  | 'single-syllable'
  | 'multisyllabic'
  | 'morphological'
  | 'greek-latin';

/** Private, source-owned context for a Student Notebook move. */
export interface Part2NotebookContext {
  /** Printed Student Notebook page only when the source explicitly verifies it. */
  pageNumber?: number;
  /** Source-verified notebook section. */
  section?: string;
  /** Source-verified subheading on that page. */
  subheading?: string;
  /** Source-verified placement within the page. */
  pageLocation?: string;
  /** Nearby source-verified landmarks that help the teacher locate the entry. */
  nearbyContext?: string[];
  /** Section/page/location only when the source explicitly verifies it. */
  location?: string;
  /** The source-supplied visual/form of the entry. */
  entryAppearance?: string;
  /** Why the entry is being added at this point in the lesson. */
  purpose?: string;
  /** A source-described visual when shipping a source image is not practical. */
  visualReference?: string;
}

/**
 * Student-facing notebook facsimiles are data, not a layout inferred from
 * teacher prose. The current renderer supports an Answer-Key verified
 * sound-entry grid and deliberately refuses unsupported layouts.
 */
export type Part2NotebookVisualLayout = 'sound-entry-grid';
export type Part2NotebookVisualRowKind = 'reference-panel' | 'entry';

export interface Part2NotebookVisualRow {
  id: string;
  kind: Part2NotebookVisualRowKind;
  /** Source order within the physical notebook page. */
  sourceOrder: number;
  /** Source-verified label for a nearby reference panel. */
  label?: string;
  /** Source-verified left-column spelling/symbol for an entry row. */
  pattern?: string;
  /** Source-verified keyword text in the entry row. */
  keyword?: string;
  /** Source-verified right-column sound/response. */
  sound?: string;
  /** Source-described visual cue label; no replacement image is invented. */
  visualCue?: string;
  /** Source-verified nearby lesson label when printed with the entry. */
  stepLabel?: string;
  /** The exact row/box for the new notebook entry. */
  target?: boolean;
  /** A source-verified shaded reference panel. */
  shaded?: boolean;
}

/** A runtime-resolved private whole-page asset; never a repository file. */
export interface Part2NotebookPageImage {
  assetId: string;
  sourcePageNumber: number;
  aspectRatio: number;
  /** Short-lived authenticated/signed URL, injected outside source control. */
  imageUrl?: string;
}

export interface Part2NotebookVisual {
  layout: Part2NotebookVisualLayout;
  pageNumber: number;
  section: string;
  subheading: string;
  rows: Part2NotebookVisualRow[];
}

/**
 * Student-safe meaning with teacher-private Answer Key context.  The runner
 * never derives these values from a spelling string or card label.
 */
export interface Part2WordElementMeaning {
  objectId: string;
  meaning: string;
  sourceContext?: Part2NotebookContext;
}

export type Part2SourceSection = 'introductory-and-ongoing' | 'subsequent-lessons';
export type Part2ProjectPacingRule = 'include-subsequent-in-introduction';

export interface Part2StepSourceReference {
  sourceIds: string[];
  locator?: string;
}

export interface Part2SaveHints {
  troubleSpotPrompt?: string;
  notePrompt?: string;
}

export interface Part2InstructionStep {
  kind: 'step';
  id: string;
  /** Every runnable move must identify whether its wording came from a source. */
  provenance: Part2PresentationProvenance;
  actionType: Part2ActionType;
  displayType: Part2DisplayType;
  /** Explicit presentation/staging mode; never inferred from drag interaction. */
  layout: Part2InstructionLayout;
  teacherCue: string;
  teacherDirections: string[];
  studentPrompt?: string;
  objects: Part2InstructionObject[];
  /** Required for source-controlled Part 2 build/read/manipulation moves. */
  cardRepresentation?: Part2CardRepresentation;
  /** Kept private; stripped before a passive student projection is created. */
  notebookContext?: Part2NotebookContext;
  /**
   * Student-safe, Answer-Key-grounded page recreation. It contains no
   * teacher locator prose and is retained in the passive projection.
   */
  notebookVisual?: Part2NotebookVisual;
  /** Optional private full-page Answer Key asset; facsimile remains the fallback. */
  notebookPageImage?: Part2NotebookPageImage;
  /**
   * Source-verified, student-friendly meanings for supplied Word Element
   * Cards.  sourceContext is stripped before passive projection, but the
   * verified meaning remains available next to the manipulable card.
   */
  wordElementMeanings?: Part2WordElementMeaning[];
  expectedStudentAction?: string;
  teachingPoint?: string;
  sourceRef: Part2StepSourceReference;
  sourceSection: Part2SourceSection;
  projectPacingRule?: Part2ProjectPacingRule;
  saveHints?: Part2SaveHints;
}

export interface Part2InvalidInstructionStep {
  kind: 'invalid';
  id: string;
  reason: string;
}

export type Part2InteractiveStep = Part2InstructionStep | Part2InvalidInstructionStep;

export interface Part2InteractivePresentation {
  version: 1;
  focus?: LessonFocus;
  steps: Part2InteractiveStep[];
  /** Set only on the intentionally redacted passive-display projection. */
  studentProjection?: boolean;
}

/** The 2026–27 project pacing convention; it is not a Wilson claim. */
export const PART2_SUBSEQUENT_INTRO_PACING_RULE: Part2ProjectPacingRule = 'include-subsequent-in-introduction';
export const PART2_SUBSEQUENT_INTRO_PACING_LABEL = '2026–27 project pacing rule: begin source-ordered Subsequent Lessons material in Introduction.';

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

export interface Part2WordRowFrame extends Part2FrameBase {
  kind: 'word-row';
  words: string[];
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

export interface Part2WordBuildFrame extends Part2FrameBase {
  kind: 'word-build';
  steps: Part2BuildStep[];
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
  | Part2WordRowFrame
  | Part2WordElementsFrame
  | Part2WordChangeFrame
  | Part2WordBuildFrame
  | Part2ContrastFrame
  | Part2ExplanationFrame
  | Part2NotebookFrame
  | Part2InvalidFrame;

export interface Part2PresentationV1 {
  version: 1;
  focus?: LessonFocus;
  frames: Part2PresentationFrame[];
  /** Optional during rollout; legacy semantic frames remain supported. */
  interactiveSteps?: Part2InteractiveStep[];
}

const TILE_ROLES = new Set<Part2TileRole>([
  'consonant', 'vowel', 'consonant-digraph', 'consonant-trigraph', 'vowel-team', 'welded',
  'r-controlled', 'prefix', 'suffix', 'base-element', 'greek-combining-form'
]);

const ELEMENT_ROLES = new Set<Part2WordElement['role']>([
  'prefix', 'suffix', 'base-element', 'greek-combining-form'
]);

const BUILD_UNIT_ROLES = new Set<Part2BuildUnitRole>([
  ...TILE_ROLES,
  'word',
  'syllable'
]);

const PROVENANCE_VALUES = new Set<Part2PresentationProvenance>([
  'source-verbatim', 'source-paraphrase', 'teacher-created'
]);

const FOCUS_VALUES = new Set<LessonFocus>([
  'introduction', 'accuracy', 'automaticity-fluency', 'mixed'
]);

const ACTION_TYPES = new Set<Part2ActionType>([
  'REVIEW_BUILD', 'TEACH_CARD', 'BUILD_WORD', 'PRACTICE_BUILD',
  'READ_WORDS', 'MARK_WORDS', 'NOTEBOOK', 'AFFIX_MANIPULATION', 'WORD_ELEMENT_BUILD'
]);

const DISPLAY_TYPES = new Set<Part2DisplayType>([
  'LETTER_SOUND_TILES', 'SYLLABLE_CARDS', 'PREFIX_SUFFIX_CARDS',
  'WORD_ELEMENT_CARDS', 'WRITTEN_WORD', 'NOTEBOOK', 'MIXED_SOURCE_CARDS'
]);

const INSTRUCTION_OBJECT_ROLES = new Set<Part2InstructionObjectRole>([
  ...BUILD_UNIT_ROLES, 'notebook', 'statement'
]);

const BUILD_ACTION_TYPES = new Set<Part2ActionType>([
  'REVIEW_BUILD', 'BUILD_WORD', 'PRACTICE_BUILD', 'READ_WORDS',
  'AFFIX_MANIPULATION', 'WORD_ELEMENT_BUILD'
]);

const CARD_REPRESENTATION_VALUES = new Set<Part2CardRepresentation>([
  'single-syllable', 'multisyllabic', 'morphological', 'greek-latin'
]);

const INSTRUCTION_OBJECT_INTERACTION_VALUES = new Set<Part2InstructionObjectInteraction>([
  'movable', 'static'
]);

const INSTRUCTION_LAYOUT_VALUES = new Set<Part2InstructionLayout>([
  'pull-stack', 'review-row', 'single-card', 'notebook-page'
]);

const NOTEBOOK_VISUAL_LAYOUT_VALUES = new Set<Part2NotebookVisualLayout>([
  'sound-entry-grid'
]);

const NOTEBOOK_VISUAL_ROW_KIND_VALUES = new Set<Part2NotebookVisualRowKind>([
  'reference-panel', 'entry'
]);

const SOURCE_SECTION_VALUES = new Set<Part2SourceSection>([
  'introductory-and-ongoing', 'subsequent-lessons'
]);

const PACING_RULE_VALUES = new Set<Part2ProjectPacingRule>([
  PART2_SUBSEQUENT_INTRO_PACING_RULE
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

const normalizeTextArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.some(item => typeof item !== 'string' || item.trim().length === 0)) return null;
  return value as string[];
};

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
    const tileText = nonEmptyText(record?.text);
    const role = record?.role as Part2TileRole | undefined;
    if (!record || !tileText || !role || !TILE_ROLES.has(role)) return null;
    tiles.push({ text: tileText, role });
  }
  return tiles;
};

const normalizeElements = (value: unknown): Part2WordElement[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const elements: Part2WordElement[] = [];
  for (const candidate of value) {
    const record = asRecord(candidate);
    const elementText = nonEmptyText(record?.text);
    const role = record?.role as Part2WordElement['role'] | undefined;
    if (!record || !elementText || !role || !ELEMENT_ROLES.has(role)) return null;
    elements.push({ text: elementText, role });
  }
  return elements;
};

const normalizeBuildUnits = (value: unknown): Part2BuildUnit[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const units: Part2BuildUnit[] = [];
  for (const candidate of value) {
    const record = asRecord(candidate);
    const text = nonEmptyText(record?.text);
    const role = record?.role as Part2BuildUnitRole | undefined;
    if (!record || !text || !role || !BUILD_UNIT_ROLES.has(role)) return null;
    units.push({ text, role });
  }
  return units;
};

const normalizeBuildSteps = (value: unknown): Part2BuildStep[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const steps: Part2BuildStep[] = [];
  for (const candidate of value) {
    const record = asRecord(candidate);
    const units = normalizeBuildUnits(record?.units);
    if (!record || !units) return null;
    steps.push({ label: optionalText(record.label), units });
  }
  return steps;
};

const invalidInteractiveStep = (id: string, reason: string): Part2InvalidInstructionStep => ({
  kind: 'invalid', id, reason
});

const normalizeInstructionObjects = (value: unknown): Part2InstructionObject[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const objects: Part2InstructionObject[] = [];
  const ids = new Set<string>();
  for (const candidate of value) {
    const record = asRecord(candidate);
    const id = nonEmptyText(record?.id);
    const objectText = nonEmptyText(record?.text);
    const role = record?.role as Part2InstructionObjectRole | undefined;
    const stagingOrder = record?.stagingOrder;
    const interaction = record?.interaction as Part2InstructionObjectInteraction | undefined;
    if (!record || !id || !objectText || !role || !INSTRUCTION_OBJECT_ROLES.has(role) || ids.has(id)) return null;
    if (stagingOrder !== undefined && (!Number.isInteger(stagingOrder) || Number(stagingOrder) < 1)) return null;
    if (interaction !== undefined && !INSTRUCTION_OBJECT_INTERACTION_VALUES.has(interaction)) return null;
    ids.add(id);
    objects.push({
      id,
      text: objectText,
      role,
      stagingOrder: stagingOrder as number | undefined,
      interaction
    });
  }
  return objects;
};

const normalizeSourceRef = (value: unknown): Part2StepSourceReference | null => {
  const record = asRecord(value);
  const sourceIds = normalizeTextArray(record?.sourceIds);
  if (!record || !sourceIds) return null;
  return { sourceIds, locator: optionalText(record.locator) };
};

const normalizeSaveHints = (value: unknown): Part2SaveHints | undefined | null => {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record) return null;
  const troubleSpotPrompt = optionalText(record.troubleSpotPrompt);
  const notePrompt = optionalText(record.notePrompt);
  if (!troubleSpotPrompt && !notePrompt) return null;
  return { troubleSpotPrompt, notePrompt };
};

const normalizeNotebookContext = (value: unknown): Part2NotebookContext | undefined | null => {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record) return null;
  const pageNumber = record.pageNumber;
  if (pageNumber !== undefined && (typeof pageNumber !== 'number' || !Number.isInteger(pageNumber) || pageNumber < 1)) return null;
  const section = optionalText(record.section);
  const subheading = optionalText(record.subheading);
  const pageLocation = optionalText(record.pageLocation);
  const nearbyContext = record.nearbyContext === undefined
    ? undefined
    : normalizeTextArray(record.nearbyContext);
  const location = optionalText(record.location);
  const entryAppearance = optionalText(record.entryAppearance);
  const purpose = optionalText(record.purpose);
  const visualReference = optionalText(record.visualReference);
  if (nearbyContext === null) return null;
  if (
    pageNumber === undefined && !section && !subheading && !pageLocation && !nearbyContext
    && !location && !entryAppearance && !purpose && !visualReference
  ) return null;
  return {
    pageNumber: pageNumber as number | undefined,
    section,
    subheading,
    pageLocation,
    nearbyContext,
    location,
    entryAppearance,
    purpose,
    visualReference
  };
};

const normalizeNotebookPageImage = (value: unknown): Part2NotebookPageImage | undefined | null => {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  const assetId = nonEmptyText(record?.assetId);
  const sourcePageNumber = record?.sourcePageNumber;
  const aspectRatio = record?.aspectRatio;
  const imageUrl = optionalText(record?.imageUrl);
  if (!record || !assetId || typeof sourcePageNumber !== 'number' || !Number.isInteger(sourcePageNumber) || sourcePageNumber < 1 || typeof aspectRatio !== 'number' || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return null;
  if (imageUrl && !(/^(?:https:\/\/|\/(?!\/))/.test(imageUrl))) return null;
  return { assetId, sourcePageNumber, aspectRatio, imageUrl };
};

const normalizeNotebookVisual = (value: unknown): Part2NotebookVisual | undefined | null => {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  const layout = record?.layout as Part2NotebookVisualLayout | undefined;
  const pageNumber = record?.pageNumber;
  const section = optionalText(record?.section);
  const subheading = optionalText(record?.subheading);
  if (
    !record
    || !layout
    || !NOTEBOOK_VISUAL_LAYOUT_VALUES.has(layout)
    || typeof pageNumber !== 'number'
    || !Number.isInteger(pageNumber)
    || pageNumber < 1
    || !section
    || !subheading
    || !Array.isArray(record.rows)
    || record.rows.length === 0
  ) return null;

  const seenIds = new Set<string>();
  const rows: Part2NotebookVisualRow[] = [];
  for (const candidate of record.rows) {
    const row = asRecord(candidate);
    const id = nonEmptyText(row?.id);
    const kind = row?.kind as Part2NotebookVisualRowKind | undefined;
    const sourceOrder = row?.sourceOrder;
    const label = optionalText(row?.label);
    const pattern = optionalText(row?.pattern);
    const keyword = optionalText(row?.keyword);
    const sound = optionalText(row?.sound);
    const visualCue = optionalText(row?.visualCue);
    const stepLabel = optionalText(row?.stepLabel);
    const target = row?.target === true;
    const shaded = row?.shaded === true;
    if (
      !row
      || !id
      || seenIds.has(id)
      || !kind
      || !NOTEBOOK_VISUAL_ROW_KIND_VALUES.has(kind)
      || !Number.isInteger(sourceOrder)
      || Number(sourceOrder) < 1
    ) return null;
    if (kind === 'reference-panel' && !label) return null;
    if (kind === 'entry' && (!pattern || !keyword || !sound)) return null;
    if (kind === 'reference-panel' && (pattern || keyword || sound || visualCue || stepLabel || target)) return null;
    seenIds.add(id);
    rows.push({ id, kind, sourceOrder: Number(sourceOrder), label, pattern, keyword, sound, visualCue, stepLabel, target, shaded });
  }

  const ordered = [...rows].sort((left, right) => left.sourceOrder - right.sourceOrder);
  if (ordered.some((row, index) => row.sourceOrder !== index + 1)) return null;
  if (rows.filter(row => row.kind === 'entry' && row.target).length !== 1) return null;
  return { layout, pageNumber, section, subheading, rows: ordered };
};

const normalizeWordElementMeanings = (
  value: unknown
): Part2WordElementMeaning[] | undefined | null => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) return null;
  const seenObjectIds = new Set<string>();
  const meanings: Part2WordElementMeaning[] = [];
  for (const candidate of value) {
    const record = asRecord(candidate);
    const objectId = nonEmptyText(record?.objectId);
    const meaning = nonEmptyText(record?.meaning);
    const sourceContext = normalizeNotebookContext(record?.sourceContext);
    if (!record || !objectId || !meaning || seenObjectIds.has(objectId) || sourceContext === null) return null;
    seenObjectIds.add(objectId);
    meanings.push({ objectId, meaning, sourceContext: sourceContext || undefined });
  }
  return meanings;
};

const buildValidationError = (
  actionType: Part2ActionType,
  displayType: Part2DisplayType,
  objects: Part2InstructionObject[],
  cardRepresentation?: Part2CardRepresentation
): string | null => {
  if (!BUILD_ACTION_TYPES.has(actionType)) return null;
  if (!cardRepresentation) {
    return 'Build/read/manipulation steps require an explicit source-supplied cardRepresentation.';
  }
  const staged = objects.map(object => object.stagingOrder);
  if (staged.some(order => order === undefined)) return 'Build/manipulation steps require an explicit stagingOrder for every object.';
  const ordered = [...(staged as number[])].sort((left, right) => left - right);
  if (ordered.some((order, index) => order !== index + 1)) {
    return 'Build/manipulation stagingOrder values must be the source-supplied sequence 1 through n.';
  }

  const roles = objects.map(object => object.role);
  const tileRole = (role: Part2InstructionObjectRole) => TILE_ROLES.has(role as Part2TileRole);
  const elementRole = (role: Part2InstructionObjectRole) => ELEMENT_ROLES.has(role as Part2WordElement['role']);

  if (cardRepresentation === 'single-syllable' && displayType !== 'LETTER_SOUND_TILES') {
    return 'single-syllable source representations require explicit Letter-Sound Tiles.';
  }
  if (cardRepresentation === 'multisyllabic' && displayType !== 'SYLLABLE_CARDS') {
    return 'multisyllabic source representations require explicit Syllable Cards.';
  }
  if (cardRepresentation === 'morphological' && !['PREFIX_SUFFIX_CARDS', 'WORD_ELEMENT_CARDS'].includes(displayType)) {
    return 'morphological source representations require explicit Prefix/Suffix or Word Element Cards.';
  }
  if (cardRepresentation === 'greek-latin' && displayType !== 'WORD_ELEMENT_CARDS') {
    return 'Greek/Latin source representations require explicit Word Element Cards.';
  }

  switch (displayType) {
    case 'LETTER_SOUND_TILES':
      return roles.every(tileRole) ? null : 'LETTER_SOUND_TILES requires explicit Letter-Sound tile roles.';
    case 'SYLLABLE_CARDS':
      return roles.every(role => role === 'syllable') ? null : 'SYLLABLE_CARDS requires explicit syllable-card objects.';
    case 'PREFIX_SUFFIX_CARDS':
      if (!roles.some(role => role === 'prefix' || role === 'suffix')) {
        return 'PREFIX_SUFFIX_CARDS requires a supplied Prefix or Suffix Card.';
      }
      return roles.every(role => tileRole(role) || role === 'prefix' || role === 'suffix')
        ? null
        : 'PREFIX_SUFFIX_CARDS may contain only supplied Letter-Sound, Prefix, or Suffix Cards.';
    case 'WORD_ELEMENT_CARDS':
      return roles.every(elementRole) && roles.some(role => role === 'base-element' || role === 'greek-combining-form')
        ? null
        : 'WORD_ELEMENT_CARDS requires explicit supplied Word Element Cards.';
    case 'MIXED_SOURCE_CARDS':
      return roles.every(role => tileRole(role) || role === 'syllable' || elementRole(role))
        ? null
        : 'MIXED_SOURCE_CARDS requires explicit source-controlled card roles.';
    default:
      return `${displayType} is not a build/manipulation display type.`;
  }
};

const actionValidationError = (
  actionType: Part2ActionType,
  displayType: Part2DisplayType,
  layout: Part2InstructionLayout,
  objects: Part2InstructionObject[],
  cardRepresentation?: Part2CardRepresentation,
  notebookContext?: Part2NotebookContext,
  notebookVisual?: Part2NotebookVisual,
  notebookPageImage?: Part2NotebookPageImage,
  wordElementMeanings?: Part2WordElementMeaning[],
  studentPrompt?: string
): string | null => {
  // Only a supplied written-word marking surface may carry a student prompt.
  // All build/read/manipulation and card-presentation wording stays private.
  if (studentPrompt && !(actionType === 'MARK_WORDS' && displayType === 'WRITTEN_WORD')) {
    return 'Only MARK_WORDS on a supplied written-word surface may supply a studentPrompt; keep answer-bearing directions teacher-private.';
  }
  if (BUILD_ACTION_TYPES.has(actionType) && layout !== 'pull-stack') {
    return 'Build/read/manipulation steps require explicit pull-stack staging.';
  }
  if (actionType === 'NOTEBOOK' && layout !== 'notebook-page') {
    return 'NOTEBOOK steps require the explicit notebook-page layout.';
  }
  if (actionType !== 'NOTEBOOK' && layout === 'notebook-page') {
    return 'notebook-page layout may only be supplied for a NOTEBOOK step.';
  }
  if (actionType === 'READ_WORDS' && displayType === 'WRITTEN_WORD') {
    return 'READ_WORDS cannot fall back to WRITTEN_WORD; source-supplied card segmentation is required.';
  }
  if (actionType === 'MARK_WORDS') {
    if (displayType !== 'WRITTEN_WORD') return 'MARK_WORDS requires a supplied written-word marking surface.';
    if (!objects.every(object => object.role === 'word')) return 'MARK_WORDS requires explicit written-word objects.';
  }
  if (actionType === 'NOTEBOOK') {
    if (displayType !== 'NOTEBOOK') return 'NOTEBOOK requires the NOTEBOOK display type.';
    if (!objects.every(object => object.role === 'notebook')) return 'NOTEBOOK requires explicit notebook-entry objects.';
    if (notebookPageImage && notebookContext?.pageNumber && notebookPageImage.sourcePageNumber !== notebookContext.pageNumber) return 'notebookPageImage sourcePageNumber must match the source-verified notebookContext pageNumber.';
    if (notebookVisual && notebookContext?.pageNumber && notebookVisual.pageNumber !== notebookContext.pageNumber) {
      return 'notebookVisual pageNumber must match the source-verified notebookContext pageNumber.';
    }
    if (notebookVisual && notebookContext?.section && notebookVisual.section !== notebookContext.section) {
      return 'notebookVisual section must match the source-verified notebookContext section.';
    }
    if (notebookVisual && notebookContext?.subheading && notebookVisual.subheading !== notebookContext.subheading) {
      return 'notebookVisual subheading must match the source-verified notebookContext subheading.';
    }
  } else if (notebookContext || notebookVisual || notebookPageImage) {
    return notebookVisual
      ? 'notebookVisual may only be supplied for a NOTEBOOK step.'
      : 'notebookContext may only be supplied for a NOTEBOOK step.';
  }
  if (wordElementMeanings) {
    if (displayType !== 'WORD_ELEMENT_CARDS') {
      return 'wordElementMeanings may only be supplied with explicit Word Element Cards.';
    }
    const objectById = new Map(objects.map(object => [object.id, object]));
    for (const entry of wordElementMeanings) {
      const object = objectById.get(entry.objectId);
      if (!object || !['base-element', 'greek-combining-form'].includes(object.role)) {
        return 'wordElementMeanings must reference an explicit supplied Word Element Card.';
      }
    }
  }
  if (!BUILD_ACTION_TYPES.has(actionType) && cardRepresentation) {
    return 'cardRepresentation may only be supplied for a source-controlled build/read/manipulation step.';
  }
  return null;
};

const normalizeInteractiveStep = (
  value: unknown,
  index: number,
  allowRedactedTeacherFields = false
): Part2InteractiveStep => {
  const record = asRecord(value);
  const fallbackId = `invalid-step-${index + 1}`;
  const id = nonEmptyText(record?.id) || fallbackId;
  if (!record) return invalidInteractiveStep(id, 'Instructional step must be an object.');

  const actionType = record.actionType as Part2ActionType | undefined;
  const displayType = record.displayType as Part2DisplayType | undefined;
  const layout = record.layout as Part2InstructionLayout | undefined;
  const teacherCue = nonEmptyText(record.teacherCue);
  const teacherDirections = normalizeTextArray(record.teacherDirections);
  const objects = normalizeInstructionObjects(record.objects);
  const sourceRef = normalizeSourceRef(record.sourceRef);
  const sourceSection = (record.sourceSection ?? 'introductory-and-ongoing') as Part2SourceSection;
  const projectPacingRule = record.projectPacingRule as Part2ProjectPacingRule | undefined;
  const saveHints = normalizeSaveHints(record.saveHints);
  const cardRepresentation = record.cardRepresentation as Part2CardRepresentation | undefined;
  const notebookContext = normalizeNotebookContext(record.notebookContext);
  const notebookVisual = normalizeNotebookVisual(record.notebookVisual);
  const notebookPageImage = normalizeNotebookPageImage(record.notebookPageImage);
  const wordElementMeanings = normalizeWordElementMeanings(record.wordElementMeanings);
  const studentPrompt = optionalText(record.studentPrompt);
  const provenance = record.provenance as Part2PresentationProvenance | undefined;

  if (!actionType || !ACTION_TYPES.has(actionType)) return invalidInteractiveStep(id, 'Instructional actionType is missing or unsupported.');
  if (!displayType || !DISPLAY_TYPES.has(displayType)) return invalidInteractiveStep(id, 'Instructional displayType is missing or unsupported.');
  if (!layout || !INSTRUCTION_LAYOUT_VALUES.has(layout)) return invalidInteractiveStep(id, 'Instructional layout is missing or unsupported.');
  if (!provenance || !PROVENANCE_VALUES.has(provenance)) return invalidInteractiveStep(id, 'Instructional provenance is missing or unsupported.');
  if (!teacherCue && !allowRedactedTeacherFields) return invalidInteractiveStep(id, 'A concise source-derived teacherCue is required.');
  if (!teacherDirections && !allowRedactedTeacherFields) return invalidInteractiveStep(id, 'Source-derived teacherDirections are required.');
  if (!objects) return invalidInteractiveStep(id, 'Instructional objects must have explicit ids, text, and roles.');
  if (!sourceRef && !allowRedactedTeacherFields) return invalidInteractiveStep(id, 'sourceRef.sourceIds is required for every interactive instructional step.');
  if (!SOURCE_SECTION_VALUES.has(sourceSection)) return invalidInteractiveStep(id, 'sourceSection is not recognized.');
  if (projectPacingRule !== undefined && !PACING_RULE_VALUES.has(projectPacingRule)) {
    return invalidInteractiveStep(id, 'projectPacingRule is not recognized.');
  }
  if (projectPacingRule && sourceSection !== 'subsequent-lessons') {
    return invalidInteractiveStep(id, 'A projectPacingRule may only be attached to Subsequent Lessons source material.');
  }
  if (saveHints === null) return invalidInteractiveStep(id, 'saveHints must contain a supplied prompt.');
  if (cardRepresentation !== undefined && !CARD_REPRESENTATION_VALUES.has(cardRepresentation)) {
    return invalidInteractiveStep(id, 'cardRepresentation is not recognized.');
  }
  if (notebookContext === null) return invalidInteractiveStep(id, 'notebookContext must contain source-supplied notebook context.');
  if (notebookVisual === null) return invalidInteractiveStep(id, 'notebookVisual must contain a complete source-supplied visual layout.');
  if (notebookPageImage === null) return invalidInteractiveStep(id, 'notebookPageImage must contain a valid private source-page reference.');
  if (wordElementMeanings === null) return invalidInteractiveStep(id, 'wordElementMeanings must contain source-supplied meaning data.');

  const actionError = actionValidationError(
    actionType,
    displayType,
    layout,
    objects,
    cardRepresentation,
    notebookContext || undefined,
    notebookVisual || undefined,
    notebookPageImage || undefined,
    wordElementMeanings || undefined,
    studentPrompt
  );
  if (actionError) return invalidInteractiveStep(id, actionError);
  const buildError = buildValidationError(actionType, displayType, objects, cardRepresentation);
  if (buildError) return invalidInteractiveStep(id, buildError);

  return {
    kind: 'step', id, provenance, actionType, displayType, layout,
    teacherCue: teacherCue || '', teacherDirections: teacherDirections || [],
    studentPrompt, objects, cardRepresentation,
    notebookContext: notebookContext || undefined,
    notebookVisual: notebookVisual || undefined,
    notebookPageImage: notebookPageImage || undefined,
    wordElementMeanings: wordElementMeanings || undefined,
    expectedStudentAction: optionalText(record.expectedStudentAction),
    teachingPoint: optionalText(record.teachingPoint), sourceRef: sourceRef || { sourceIds: [] }, sourceSection,
    projectPacingRule, saveHints: saveHints || undefined
  };
};

export const isPart2BuildAction = (actionType: Part2ActionType) => BUILD_ACTION_TYPES.has(actionType);

export const isPart2StepIncludedForFocus = (step: Part2InteractiveStep, focus?: LessonFocus): boolean => {
  if (step.kind === 'invalid') return true;
  if (focus !== 'introduction' || step.sourceSection !== 'subsequent-lessons') return true;
  return step.projectPacingRule === PART2_SUBSEQUENT_INTRO_PACING_RULE;
};

/**
 * Returns null when the source supplied only the existing semantic-frame path.
 * A malformed runner source returns a safe unavailable step instead of
 * synthesizing structure from spelling or prose.
 */
export const part2InteractivePresentationFromData = (partData: unknown): Part2InteractivePresentation | null => {
  const data = asRecord(partData);
  const presentation = asRecord(data?.part2Presentation);
  if (!presentation || !Object.prototype.hasOwnProperty.call(presentation, 'interactiveSteps')) return null;

  if (presentation.version !== 1) {
    return { version: 1, steps: [invalidInteractiveStep('invalid-presentation', 'Part 2 interactive presentation version is missing or unsupported.')] };
  }

  const focus = presentation.focus as LessonFocus | undefined;
  if (focus !== undefined && !FOCUS_VALUES.has(focus)) {
    return { version: 1, steps: [invalidInteractiveStep('invalid-presentation', 'Part 2 presentation focus is not recognized.')] };
  }
  if (!Array.isArray(presentation.interactiveSteps) || presentation.interactiveSteps.length === 0) {
    return { version: 1, focus, steps: [invalidInteractiveStep('invalid-presentation', 'Part 2 interactiveSteps contains no steps.')] };
  }

  const studentProjection = presentation.studentProjection === true;
  const normalized = presentation.interactiveSteps.map((step, index) => (
    normalizeInteractiveStep(step, index, studentProjection)
  ));
  const included = normalized.filter(step => isPart2StepIncludedForFocus(step, focus));
  return {
    version: 1,
    focus,
    studentProjection,
    steps: included.length > 0
      ? included
      : [invalidInteractiveStep('no-introduction-steps', 'No source-authorized interactive Part 2 steps are available for this lesson focus.')]
  };
};

export const encodePart2SemanticUnit = (role: string, value: string) => (
  `§p2:${role}:${encodeURIComponent(value)}`
);

/** Removes teacher-private source cues before a runner is sent to a passive display. */
export const sanitizePart2PresentationForStudent = (value: unknown): unknown => {
  const presentation = asRecord(value);
  if (!presentation) return undefined;
  const interactiveSteps = Array.isArray(presentation.interactiveSteps)
    ? presentation.interactiveSteps.map(step => {
      const record = asRecord(step);
      if (!record) return step;
      const studentStep = { ...record };
      for (const privateKey of [
        'teacherCue', 'teacherDirections', 'teachingPoint',
        'expectedStudentAction', 'sourceRef', 'saveHints', 'notebookContext'
      ]) {
        delete studentStep[privateKey];
      }
      if (!(studentStep.actionType === 'MARK_WORDS' && studentStep.displayType === 'WRITTEN_WORD')) {
        delete studentStep.studentPrompt;
      }
      if (Array.isArray(studentStep.wordElementMeanings)) {
        studentStep.wordElementMeanings = studentStep.wordElementMeanings.map(entry => {
          const meaning = asRecord(entry);
          return meaning
            ? { objectId: meaning.objectId, meaning: meaning.meaning }
            : entry;
        });
      }
      return studentStep;
    })
    : undefined;
  return {
    version: presentation.version,
    studentProjection: true,
    ...(presentation.focus !== undefined ? { focus: presentation.focus } : {}),
    ...(interactiveSteps ? { interactiveSteps } : {})
  };
};

const normalizeFrame = (value: unknown, index: number): Part2PresentationFrame => {
  const record = asRecord(value);
  if (!record) return invalidFrame(`invalid-${index + 1}`, 'Frame must be an object.');

  const base = normalizeBase(record, index);
  if ('kind' in base && base.kind === 'invalid') return base;

  switch (record.kind) {
    case 'tile-row': {
      const tiles = normalizeTiles(record.tiles);
      return tiles ? { ...base, kind: 'tile-row', tiles } : invalidFrame(base.id, 'tile-row requires explicit tiles.');
    }
    case 'syllable-row': {
      const syllables = normalizeTextArray(record.syllables);
      return syllables
        ? { ...base, kind: 'syllable-row', syllables }
        : invalidFrame(base.id, 'syllable-row requires explicit syllables.');
    }
    case 'word-row': {
      const words = normalizeTextArray(record.words);
      return words
        ? { ...base, kind: 'word-row', words }
        : invalidFrame(base.id, 'word-row requires explicit words.');
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
    case 'word-build': {
      const steps = normalizeBuildSteps(record.steps);
      return steps
        ? { ...base, kind: 'word-build', steps }
        : invalidFrame(base.id, 'word-build requires explicit steps and units.');
    }
    case 'contrast': {
      const left = normalizeTiles(record.left);
      const right = normalizeTiles(record.right);
      return left && right
        ? { ...base, kind: 'contrast', left, right }
        : invalidFrame(base.id, 'contrast requires explicit left and right tiles.');
    }
    case 'explanation': {
      const explanationText = nonEmptyText(record.text);
      return explanationText
        ? { ...base, kind: 'explanation', text: explanationText }
        : invalidFrame(base.id, 'explanation requires supplied text.');
    }
    case 'notebook': {
      const notebookText = nonEmptyText(record.text);
      return notebookText
        ? { ...base, kind: 'notebook', text: notebookText, section: optionalText(record.section) }
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

const semanticUnit = (role: string, value: string) => (
  `|§p2:${role}:${encodeURIComponent(value)}|`
);

const encodeTile = (tile: Part2PresentationTile) => semanticUnit(tile.role, tile.text);
const encodeTiles = (tiles: Part2PresentationTile[]) => tiles.map(encodeTile).join(' ');
const encodeAnnotation = (annotation?: string) => annotation ? ` ${semanticUnit('annotation', annotation)}` : '';

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
    case 'word-row':
      content = frame.words.map(word => semanticUnit('word', word)).join(' ');
      break;
    case 'word-elements':
      content = frame.elements.map(element => semanticUnit(element.role, element.text)).join(' ');
      break;
    case 'word-change':
      content = `${encodeTiles(frame.before)} ${semanticUnit('symbol', '→')} ${encodeTiles(frame.after)}`;
      break;
    case 'word-build':
      content = frame.steps.map(step => {
        const label = step.label ? `${semanticUnit('step-label', step.label)} ` : '';
        const units = step.units.map(unit => semanticUnit(unit.role, unit.text)).join(' ');
        return `${label}${units} ${semanticUnit('row-break', '')}`;
      }).join(' ');
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

  content += encodeAnnotation(frame.annotation);

  return {
    id: `part2-${frame.id}`,
    type: 'template',
    title,
    content,
    elements: [],
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
