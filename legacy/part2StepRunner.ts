export interface Part2StepRunnerNavigationState {
  activeIndex: number;
}

export const PART2_SAVE_NOTE_PREFIX = '[Part 2 save]';

const clampIndex = (index: number, stepCount: number) => (
  Math.max(0, Math.min(Math.max(0, stepCount - 1), index))
);

export const createPart2StepRunnerNavigation = (stepCount: number): Part2StepRunnerNavigationState => ({
  activeIndex: clampIndex(0, stepCount)
});

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
