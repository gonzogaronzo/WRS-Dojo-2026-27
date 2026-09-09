import type { Part2InteractiveStep } from './part2Presentation';

export interface Part2StepRunnerNavigationState {
  activeIndex: number;
  quickPracticeAnchorId?: string;
}

export const PART2_SAVE_NOTE_PREFIX = '[Part 2 save]';

const clampIndex = (index: number, stepCount: number) => (
  Math.max(0, Math.min(Math.max(0, stepCount - 1), index))
);

export const createPart2StepRunnerNavigation = (stepCount: number): Part2StepRunnerNavigationState => ({
  activeIndex: clampIndex(0, stepCount)
});

/**
 * A Quick Practice is a view-state insertion. It deliberately does not change
 * the source-owned step array or its ordering.
 */
export const insertPart2QuickPractice = (
  state: Part2StepRunnerNavigationState,
  steps: readonly Part2InteractiveStep[]
): Part2StepRunnerNavigationState => {
  const active = steps[clampIndex(state.activeIndex, steps.length)];
  if (!active || active.kind === 'invalid') return { ...state };
  return { activeIndex: clampIndex(state.activeIndex, steps.length), quickPracticeAnchorId: active.id };
};

export const clearPart2QuickPractice = (
  state: Part2StepRunnerNavigationState,
  stepCount: number
): Part2StepRunnerNavigationState => ({ activeIndex: clampIndex(state.activeIndex, stepCount) });

export const nextPart2Step = (
  state: Part2StepRunnerNavigationState,
  stepCount: number
): Part2StepRunnerNavigationState => ({ activeIndex: clampIndex(state.activeIndex + 1, stepCount) });

export const previousPart2Step = (
  state: Part2StepRunnerNavigationState,
  stepCount: number
): Part2StepRunnerNavigationState => ({ activeIndex: clampIndex(state.activeIndex - 1, stepCount) });

export interface Part2SavePayload {
  completed: boolean;
  troubleSpots: string;
  note: string;
  stepId?: string;
}

const cleanSingleLine = (value: unknown) => (
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
);

export const createPart2SavePayload = (value: Partial<Part2SavePayload>): Part2SavePayload => ({
  completed: Boolean(value.completed),
  troubleSpots: cleanSingleLine(value.troubleSpots),
  note: cleanSingleLine(value.note),
  stepId: cleanSingleLine(value.stepId) || undefined
});

export const formatPart2SavePayload = (payload: Part2SavePayload): string => {
  const fields = [
    `completion=${payload.completed ? 'complete' : 'in-progress'}`,
    `trouble spots=${payload.troubleSpots || 'none noted'}`,
    `note=${payload.note || 'none'}`
  ];
  if (payload.stepId) fields.push(`step=${payload.stepId}`);
  return `${PART2_SAVE_NOTE_PREFIX} ${fields.join('; ')}`;
};

/**
 * Keeps the Part 2 record in the existing session-notes field. This avoids a
 * new Firestore document field, rule, or schema migration while retaining a
 * concise durable lesson record.
 */
export const upsertPart2SavePayloadInNotes = (notes: string | undefined, payload: Part2SavePayload): string => {
  const retained = (notes || '')
    .split('\n')
    .filter(line => !line.trimStart().startsWith(PART2_SAVE_NOTE_PREFIX))
    .join('\n')
    .trim();
  return [retained, formatPart2SavePayload(payload)].filter(Boolean).join(retained ? '\n' : '');
};
