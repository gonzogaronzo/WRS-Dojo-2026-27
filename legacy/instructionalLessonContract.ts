import {
  RuntimeLessonPart,
  RuntimePassageQuestion,
  WRSRuntimeLessonPlan
} from './types';

export const INSTRUCTIONAL_CONTRACT_VERSION = 'wrs-teacher-plan-contract-v1' as const;

type UnknownRecord = Record<string, unknown>;

export interface InstructionalContractIssue {
  code: string;
  message: string;
  part?: RuntimeLessonPart['part'];
  severity: 'error' | 'warning';
}

export interface InstructionalContractResult {
  contractVersion: typeof INSTRUCTIONAL_CONTRACT_VERSION;
  ok: boolean;
  issues: InstructionalContractIssue[];
}

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.map(item => String(item).trim()).filter(Boolean)
  : [];

const issue = (
  code: string,
  message: string,
  part?: RuntimeLessonPart['part'],
  severity: 'error' | 'warning' = 'error'
): InstructionalContractIssue => ({ code, message, ...(part ? { part } : {}), severity });

const partOf = (runtime: WRSRuntimeLessonPlan, number: RuntimeLessonPart['part']) => (
  runtime.parts.find(part => part.part === number)
);

const placeholderPatterns = [
  /\bselect\s+(?:the\s+)?(?:cards?|sounds?|words?|items?|phrases?|sentences?|passage|examples?)\b/i,
  /\bchoose\s+(?:the\s+)?(?:cards?|sounds?|words?|items?|phrases?|sentences?|passage|examples?)\b/i,
  /\bpick\s+(?:the\s+)?(?:cards?|sounds?|words?|items?|phrases?|sentences?|passage|examples?)\b/i,
  /\breview\s+(?:the\s+)?(?:vowels?|consonants?|sounds?|words?)\b(?!\s+(?:listed|below|above))/i,
  /\buse\s+cumulative\s+(?:cards?|sounds?|words?)\b/i,
  /\badd\s+(?:more\s+)?(?:words?|sounds?|examples?|word elements?)\b/i
];

const hasPlaceholder = (value: string) => placeholderPatterns.some(pattern => pattern.test(value));

const collectPartText = (part: RuntimeLessonPart): string[] => {
  const values: string[] = [...part.teacherDirections];
  const data = asRecord(part.data);
  if (!data) return values;
  for (const value of Object.values(data)) {
    if (typeof value === 'string') values.push(value);
    if (Array.isArray(value)) {
      for (const item of value) if (typeof item === 'string') values.push(item);
    }
  }
  return values;
};

const normalizedQuestionStem = (question: string) => {
  const beforeColon = question.includes(':') ? question.split(':', 1)[0] : question;
  return beforeColon
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7)
    .join(' ');
};

const exactQuestionLadder: Array<Set<RuntimePassageQuestion['level']>> = [
  new Set(['direct-recall']),
  new Set(['direct-recall']),
  new Set(['direct-recall']),
  new Set(['sequence', 'cause-effect', 'important-detail', 'vocabulary-in-context']),
  new Set(['sequence', 'cause-effect', 'important-detail', 'vocabulary-in-context']),
  new Set(['relationship', 'reasoning', 'explanation']),
  new Set(['relationship', 'reasoning', 'explanation']),
  new Set(['inference']),
  new Set(['evidence-based-interpretation']),
  new Set(['synthesis'])
];

const currentTroubleSpots = (runtime: WRSRuntimeLessonPlan) => text(runtime.planningContext?.troubleSpots);

const validateSources = (runtime: WRSRuntimeLessonPlan, issues: InstructionalContractIssue[]) => {
  const sourceIds = new Set(runtime.sources.map(source => source.id).filter(Boolean));
  if (!sourceIds.size) issues.push(issue('source_manifest_missing', 'Lesson must carry a non-empty source manifest.'));
  for (const part of runtime.parts.filter(part => part.part < 10)) {
    if (!part.sourceIds.length) {
      issues.push(issue('part_source_missing', `Part ${part.part} has no source reference.`, part.part));
      continue;
    }
    const unknown = part.sourceIds.filter(sourceId => !sourceIds.has(sourceId));
    if (unknown.length) issues.push(issue(
      'part_source_unregistered',
      `Part ${part.part} cites source IDs absent from the lesson source manifest: ${unknown.join(', ')}.`,
      part.part
    ));
  }
};

const validatePart1 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const eligible = strings(data.eligibleVowels);
  const selected = strings(data.vowels);
  const review = strings(data.selectedReview);
  const newAfter = strings(data.newAfterInstruction);
  if (!eligible.length) issues.push(issue('part1_eligible_vowels_missing', 'Part 1 must carry the verified cumulative eligible-vowel set.', 1));
  if (!selected.length) issues.push(issue('part1_vowels_empty', 'Part 1 contains no selected vowel cards/responses.', 1));
  const missing = eligible.filter(item => !selected.includes(item));
  if (missing.length) issues.push(issue('part1_vowel_coverage_failed', `Part 1 omits eligible vowel cards/responses: ${missing.join(', ')}.`, 1));
  if (!review.length) issues.push(issue('part1_review_empty', 'Part 1 must preselect purposeful cumulative review cards.', 1));
  if (data.newCardsRequiredAfterPart2 === true && !newAfter.length) {
    issues.push(issue('part1_new_after_instruction_missing', 'Part 1 requires new cards after Part 2 but does not name them.', 1));
  }
};

const validatePart2 = (runtime: WRSRuntimeLessonPlan, part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const prior = strings(data.previousSubstepWords ?? data.reviewWords);
  if (prior.length < 3 || prior.length > 4) issues.push(issue('part2_prior_words_failed', `Part 2 requires 3-4 actual previous-Substep review words; found ${prior.length}.`, 2));
  if (runtime.focus === 'introduction') {
    const moves = Array.isArray(data.teachingMoves) ? data.teachingMoves : [];
    if (!moves.length) issues.push(issue('part2_intro_teaching_moves_missing', 'Introduction Part 2 requires structured numbered teaching moves.', 2));
    if (data.sourceSequenceComplete !== true) issues.push(issue('part2_intro_source_sequence_incomplete', 'Introduction Part 2 must verify the complete source-ordered current-Substep sequence.', 2));
  } else if (runtime.focus === 'accuracy') {
    if (!strings(data.currentExamples ?? data.currentWords).length) issues.push(issue('part2_accuracy_current_examples_missing', 'Accuracy Part 2 needs preselected current examples/contrasts.', 2));
    if (currentTroubleSpots(runtime) && !strings(data.troubleSpotTargets).length) issues.push(issue('part2_accuracy_trouble_spots_missing', 'Accuracy Part 2 has documented trouble spots but no explicit targets.', 2));
  } else if (runtime.focus === 'automaticity-fluency') {
    if (!strings(data.rapidWholeWordSet).length) issues.push(issue('part2_fluency_word_set_missing', 'Automaticity/Fluency Part 2 requires a preselected rapid whole-word set.', 2));
    if (data.introducesNewConcept !== false) issues.push(issue('part2_fluency_new_concept_failed', 'Automaticity/Fluency Part 2 must explicitly verify that no new concept is introduced.', 2));
  }
};

const validatePart3 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  if (!text(data.fatStackReference)) issues.push(issue('part3_fat_stack_reference_missing', 'Part 3 must reference the existing previous-Substep fat stack.', 3));
  for (const key of ['currentCards', 'hfwList', 'wordElements']) {
    if (!Array.isArray(data[key])) issues.push(issue('part3_packet_shape_failed', `Part 3 field ${key} must be an explicit list.`, 3));
  }
  const expected = strings(data.expectedCurrentHfw);
  const actual = strings(data.hfwList);
  const missing = expected.filter(word => !actual.includes(word));
  if (missing.length) issues.push(issue('part3_current_hfw_incomplete', `Part 3 HFW packet omits current-Substep HFWs: ${missing.join(', ')}.`, 3));
};

const validatePart4 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  if (!text(data.studentReader)) issues.push(issue('part4_reader_missing', 'Part 4 must name the exact Student Reader.', 4));
  if (!text(data.page)) issues.push(issue('part4_page_missing', 'Part 4 must name exact Student Reader page(s).', 4));
  const practice = strings(data.practiceWords);
  if (practice.length < 5 || practice.length > 6) issues.push(issue('part4_practice_count_failed', `Part 4 practice must contain 5-6 exact words; found ${practice.length}.`, 4));
  if (data.chartingPlanned === true) {
    const lists = Array.isArray(data.studentChartingLists) ? data.studentChartingLists : [];
    if (!lists.length) issues.push(issue('part4_individual_charting_required', 'Charting is planned but separate named student lists are missing.', 4));
    for (const raw of lists) {
      const list = asRecord(raw);
      const student = text(list?.studentName) || '(unnamed student)';
      const words = strings(list?.words);
      if (words.length !== 15) issues.push(issue('part4_student_charting_count_failed', `Part 4 charting list for ${student} must contain exactly 15 words; found ${words.length}.`, 4));
    }
  }
};

const validatePart5 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  if (!text(data.studentReader)) issues.push(issue('part5_reader_missing', 'Part 5 must name the exact Student Reader.', 5));
  if (!text(data.page)) issues.push(issue('part5_page_missing', 'Part 5 must name the exact sentence page.', 5));
  const sentences = strings(data.sentences);
  const questions = strings(data.weaveQuestions);
  if (sentences.length !== 10) issues.push(issue('part5_sentence_count_failed', `Part 5 requires exactly 10 embedded sentences; found ${sentences.length}.`, 5));
  if (questions.length !== 10) issues.push(issue('part5_weave_count_failed', `Part 5 requires exactly 10 weave-in questions; found ${questions.length}.`, 5));
  if (questions.length === 10) {
    const counts = new Map<string, number>();
    for (const question of questions) {
      const stem = normalizedQuestionStem(question);
      counts.set(stem, (counts.get(stem) || 0) + 1);
    }
    const maxRepeatedStem = Math.max(...counts.values());
    if (maxRepeatedStem > 4) issues.push(issue('part5_weave_variety_failed', 'Part 5 weave questions repeat one mechanical question pattern instead of varying instructional attention.', 5));
  }
};

const validatePart6 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const prompts = strings(data.quickDrillReverse ?? data.quickDrill);
  if (prompts.length < 20) issues.push(issue('part6_prompt_count_failed', `Part 6 project standard requires at least 20 fully selected sound prompts; found ${prompts.length}.`, 6));
  if (!Array.isArray(data.wordElements)) issues.push(issue('part6_word_elements_shape_failed', 'Part 6 Word Elements must be an explicit list, even when empty.', 6));
};

const validatePart7 = (runtime: WRSRuntimeLessonPlan, part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const prior = strings(data.previousSubstepWords ?? data.reviewWords);
  const current = strings(data.currentSubstepWords ?? data.currentWords);
  if (prior.length < 3 || prior.length > 4) issues.push(issue('part7_prior_words_failed', `Part 7 requires 3-4 previous-Substep words; found ${prior.length}.`, 7));
  if (current.length < 5 || current.length > 8) issues.push(issue('part7_current_words_failed', `Part 7 requires 5-8 current-Substep words; found ${current.length}.`, 7));
  if (runtime.focus === 'introduction' && !(Array.isArray(data.teachingMoves) && data.teachingMoves.length)) issues.push(issue('part7_intro_teaching_moves_missing', 'Introduction Part 7 requires structured teaching moves.', 7));
  if (runtime.focus === 'accuracy' && currentTroubleSpots(runtime) && !strings(data.troubleSpotTargets).length) issues.push(issue('part7_accuracy_trouble_spots_missing', 'Accuracy Part 7 has documented trouble spots but no explicit targets.', 7));
  if (runtime.focus === 'automaticity-fluency' && data.introducesNewConcept !== false) issues.push(issue('part7_fluency_new_concept_failed', 'Automaticity/Fluency Part 7 must explicitly verify no new concept.', 7));
};

const validatePart8 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const dictation = asRecord(data.dictation);
  if (!dictation) {
    issues.push(issue('part8_dictation_missing', 'Part 8 dictation payload is missing.', 8));
    return;
  }
  const expected: Record<string, number> = {
    sounds: 5,
    realWords: 5,
    nonsenseWords: 3,
    phrases: 3
  };
  for (const [key, count] of Object.entries(expected)) {
    const actual = strings(dictation[key]).length;
    if (actual !== count) issues.push(issue('part8_category_count_failed', `Part 8 ${key} requires exactly ${count} items; found ${actual}.`, 8));
  }
  if (typeof data.wordElementsApplicable !== 'boolean') {
    issues.push(issue('part8_word_elements_applicability_missing', 'Part 8 must explicitly state whether Word Elements are applicable at this instructional point.', 8));
  } else {
    const wordElements = strings(dictation.wordElements).length;
    const expectedWordElements = data.wordElementsApplicable ? 5 : 0;
    if (wordElements !== expectedWordElements) issues.push(issue('part8_word_elements_count_failed', `Part 8 Word Elements require ${expectedWordElements} items for this lesson; found ${wordElements}.`, 8));
  }
  const expectedSentenceCount = Number(data.expectedSentenceCount);
  if (expectedSentenceCount !== 2 && expectedSentenceCount !== 3) {
    issues.push(issue('part8_sentence_expectation_missing', 'Part 8 must explicitly set expectedSentenceCount to 2 or 3 from source/instructional need.', 8));
  } else {
    const actual = strings(dictation.sentences).length;
    if (actual !== expectedSentenceCount) issues.push(issue('part8_sentence_count_failed', `Part 8 requires ${expectedSentenceCount} sentences for this lesson; found ${actual}.`, 8));
  }
  if (!text(data.markReinforce)) issues.push(issue('part8_mark_reinforce_missing', 'Part 8 must preselect a concise Mark/Reinforce target.', 8));
};

const validatePart9 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  for (const [key, label] of [['studentReader', 'Student Reader'], ['page', 'page'], ['passageTitle', 'passage title'], ['passage', 'full passage']] as const) {
    if (!text(data[key])) issues.push(issue('part9_required_text_missing', `Part 9 must include ${label}.`, 9));
  }
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (questions.length !== 10) {
    issues.push(issue('part9_question_count_failed', `Part 9 requires exactly 10 passage questions; found ${questions.length}.`, 9));
  } else {
    questions.forEach((raw, index) => {
      const question = asRecord(raw);
      const level = text(question?.level) as RuntimePassageQuestion['level'];
      if (!text(question?.question) || !exactQuestionLadder[index].has(level)) {
        issues.push(issue('part9_question_ladder_failed', `Part 9 question ${index + 1} does not match the required difficulty ladder.`, 9));
      }
    });
  }
  const history = text(data.historyStatus);
  if (history !== 'verified-next-unread' && history !== 'uncertain-flagged') issues.push(issue('part9_history_status_missing', 'Part 9 must carry verified-next-unread or uncertain-flagged history status.', 9));
  if (history === 'uncertain-flagged' && !text(data.historyNote)) issues.push(issue('part9_history_note_missing', 'Uncertain Part 9 history requires an explicit note.', 9));
};

const validatePart10 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  if (!data.listeningComprehension && text(data.teacherPlanStatus) !== 'TBD') issues.push(issue('part10_tbd_failed', 'Part 10 must remain TBD unless a supported payload is supplied.', 10));
};

export const validateInstructionalLessonContract = (
  runtime: WRSRuntimeLessonPlan
): InstructionalContractResult => {
  const issues: InstructionalContractIssue[] = [];

  if (runtime.schemaVersion !== 'wrs-runtime-v1') issues.push(issue('schema_version_failed', 'Teacher-plan contract requires wrs-runtime-v1.'));
  if (!['introduction', 'accuracy', 'automaticity-fluency'].includes(runtime.focus)) issues.push(issue('focus_failed', 'Lesson focus must be Introduction, Accuracy, or Automaticity/Fluency.'));
  if (runtime.parts.length !== 10 || new Set(runtime.parts.map(part => part.part)).size !== 10) issues.push(issue('parts_failed', 'Lesson must contain Parts 1-10 exactly once.'));

  validateSources(runtime, issues);

  for (const part of runtime.parts) {
    const placeholders = collectPartText(part).filter(value => hasPlaceholder(value));
    if (placeholders.length) issues.push(issue('teacher_selection_placeholder', `Part ${part.part} contains teacher-selection placeholder language: ${placeholders[0]}`, part.part));
  }

  const p1 = partOf(runtime, 1); if (p1) validatePart1(p1, issues);
  const p2 = partOf(runtime, 2); if (p2) validatePart2(runtime, p2, issues);
  const p3 = partOf(runtime, 3); if (p3) validatePart3(p3, issues);
  const p4 = partOf(runtime, 4); if (p4) validatePart4(p4, issues);
  const p5 = partOf(runtime, 5); if (p5) validatePart5(p5, issues);
  const p6 = partOf(runtime, 6); if (p6) validatePart6(p6, issues);
  const p7 = partOf(runtime, 7); if (p7) validatePart7(runtime, p7, issues);
  const p8 = partOf(runtime, 8); if (p8) validatePart8(p8, issues);
  const p9 = partOf(runtime, 9); if (p9) validatePart9(p9, issues);
  const p10 = partOf(runtime, 10); if (p10) validatePart10(p10, issues);

  return {
    contractVersion: INSTRUCTIONAL_CONTRACT_VERSION,
    ok: !issues.some(item => item.severity === 'error'),
    issues
  };
};
