import {
  RuntimeLessonPart,
  RuntimePassageQuestion,
  WRSRuntimeLessonPlan
} from './types';

export const INSTRUCTIONAL_CONTRACT_VERSION = 'wrs-teacher-plan-contract-v2' as const;

type UnknownRecord = Record<string, unknown>;

const STEP_7_4_CUMULATIVE_VOWELS = [
  'a-apple-/ă/', 'a-apron-/ā/', 'a-/ä/', 'e-Ed-/ĕ/', 'e-equal-/ē/',
  'i-itch-/ĭ/', 'i-ice-/ī/', 'o-octopus-/ŏ/', 'o-open-/ō/',
  'u-up-/ŭ/', 'u-uniform-/ū/'
] as const;

const STEP_7_4_CURRENT_HFW = [
  'national', 'themselves', 'ourselves', 'half', 'whole',
  'whom', 'whose', 'question', 'suggestion'
] as const;

const WEAVE_QUESTION_CATEGORIES = new Set([
  'current-concept', 'cumulative-structure', 'vocabulary-meaning',
  'syllable-word-structure', 'phrasing-expression'
]);


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
  /\b(?:select|choose|pick)\b.{0,60}\b(?:cards?|sounds?|words?|items?|phrases?|sentences?|passage|examples?|word elements?)\b/i,
  /\breview\s+(?:the\s+)?(?:vowels?|consonants?|sounds?|words?)\b(?!\s+(?:listed|below|above))/i,
  /\buse\s+cumulative\s+(?:cards?|sounds?|words?)\b/i,
  /\badd\s+(?:more\s+)?(?:words?|sounds?|examples?|word elements?)\b/i
];

const hasPlaceholder = (value: string) => placeholderPatterns.some(pattern => pattern.test(value));

const collectStrings = (value: unknown, output: string[] = []): string[] => {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectStrings(item, output));
    return output;
  }
  if (value && typeof value === 'object') {
    Object.values(value as UnknownRecord).forEach(item => collectStrings(item, output));
  }
  return output;
};

const collectPartText = (part: RuntimeLessonPart): string[] => (
  collectStrings({ teacherDirections: part.teacherDirections, data: part.data })
);

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

const sourceById = (runtime: WRSRuntimeLessonPlan, id: string) => (
  runtime.sources.find(source => source.id === id)
);

const sourceIdsFor = (part: RuntimeLessonPart, runtime: WRSRuntimeLessonPlan, kind: string) => (
  part.sourceIds.filter(sourceId => sourceById(runtime, sourceId)?.kind === kind)
);

const validateSources = (runtime: WRSRuntimeLessonPlan, issues: InstructionalContractIssue[]) => {
  const sourceIds = new Set(runtime.sources.map(source => source.id).filter(Boolean));
  if (!sourceIds.size) issues.push(issue('source_manifest_missing', 'Lesson must carry a non-empty source manifest.'));
  for (const source of runtime.sources) {
    if (!text(source.label) || !text(source.locator)) {
      issues.push(issue('source_manifest_detail_missing', 'Each source manifest record must name its label and exact locator.'));
    }
  }
  for (const part of runtime.parts.filter(part => part.part < 10)) {
    if (!part.sourceIds.length) {
      issues.push(issue('part_source_missing', 'Part ' + part.part + ' has no source reference.', part.part));
      continue;
    }
    const unknown = part.sourceIds.filter(sourceId => !sourceIds.has(sourceId));
    if (unknown.length) issues.push(issue(
      'part_source_unregistered',
      'Part ' + part.part + ' cites source IDs absent from the lesson source manifest: ' + unknown.join(', ') + '.',
      part.part
    ));
    const unverified = part.sourceIds.filter(
      sourceId => sourceById(runtime, sourceId)?.verification === 'needs-verification'
    );
    if (unverified.length) issues.push(issue(
      'source_provenance_unverified',
      'Part ' + part.part + ' cites source material that is not source-verified and must fail closed: ' + unverified.join(', ') + '.',
      part.part
    ));
  }
};

const validatePart1 = (runtime: WRSRuntimeLessonPlan, part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const eligible = strings(data.eligibleVowels);
  const selected = strings(data.vowels);
  const review = strings(data.selectedReview);
  const newAfter = strings(data.newAfterInstruction);
  const quickDrill = strings(data.quickDrill);
  const required = runtime.step === '7' && runtime.substep === '4'
    ? [...STEP_7_4_CUMULATIVE_VOWELS]
    : eligible;

  if (!eligible.length) issues.push(issue('part1_eligible_vowels_missing', 'Part 1 must carry the verified cumulative eligible-vowel set.', 1));
  if (runtime.step === '7' && runtime.substep === '4') {
    const profileMissing = STEP_7_4_CUMULATIVE_VOWELS.filter(item => !eligible.includes(item));
    if (profileMissing.length) issues.push(issue(
      'part1_verified_vowel_profile_failed',
      'Part 1 does not carry the required verified 7.4 cumulative vowel profile: ' + profileMissing.join(', ') + '.',
      1
    ));
  }
  if (!selected.length) issues.push(issue('part1_vowels_empty', 'Part 1 contains no selected vowel cards/responses.', 1));
  const missing = required.filter(item => !selected.includes(item));
  if (missing.length) issues.push(issue('part1_vowel_coverage_failed', 'Part 1 omits required vowel cards/responses: ' + missing.join(', ') + '.', 1));
  const missingQuickDrill = required.filter(item => !quickDrill.includes(item));
  if (missingQuickDrill.length) issues.push(issue(
    'part1_quick_drill_vowel_coverage_failed',
    'Part 1 Quick Drill omits required selected vowel cards/responses: ' + missingQuickDrill.join(', ') + '.',
    1
  ));
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

const validatePart3 = (runtime: WRSRuntimeLessonPlan, part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  if (!text(data.fatStackReference)) issues.push(issue('part3_fat_stack_reference_missing', 'Part 3 must reference the existing previous-Substep fat stack.', 3));
  for (const key of ['currentCards', 'hfwList', 'wordElements']) {
    if (!Array.isArray(data[key])) issues.push(issue('part3_packet_shape_failed', 'Part 3 field ' + key + ' must be an explicit list.', 3));
  }
  const expected = strings(data.expectedCurrentHfw);
  const actual = strings(data.hfwList);
  const required = runtime.step === '7' && runtime.substep === '4'
    ? [...STEP_7_4_CURRENT_HFW]
    : expected;
  if (runtime.step === '7' && runtime.substep === '4') {
    const profileMissing = STEP_7_4_CURRENT_HFW.filter(word => !expected.includes(word));
    if (profileMissing.length) issues.push(issue(
      'part3_current_hfw_profile_failed',
      'Part 3 must carry the complete verified 7.4 High Frequency Word profile: ' + profileMissing.join(', ') + '.',
      3
    ));
  }
  const missing = required.filter(word => !actual.includes(word));
  if (missing.length) issues.push(issue('part3_current_hfw_incomplete', 'Part 3 HFW packet omits current-Substep HFWs: ' + missing.join(', ') + '.', 3));
};

const validatePart4 = (runtime: WRSRuntimeLessonPlan, part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  if (!text(data.studentReader)) issues.push(issue('part4_reader_missing', 'Part 4 must name the exact Student Reader.', 4));
  if (!text(data.page)) issues.push(issue('part4_page_missing', 'Part 4 must name exact Student Reader page(s).', 4));
  if (!sourceIdsFor(part, runtime, 'student-reader').length) {
    issues.push(issue('part4_reader_source_missing', 'Part 4 must cite a Student Reader source in its source manifest.', 4));
  }
  const practice = strings(data.practiceWords);
  if (practice.length < 5 || practice.length > 6) issues.push(issue('part4_practice_count_failed', 'Part 4 practice must contain 5-6 exact words; found ' + practice.length + '.', 4));
  if (typeof data.chartingPlanned !== 'boolean') {
    issues.push(issue('part4_charting_plan_missing', 'Part 4 must explicitly state whether a formal charting event is planned.', 4));
    return;
  }
  const lists = Array.isArray(data.studentChartingLists) ? data.studentChartingLists : [];
  const chartingWords = strings(data.chartingWords);
  if (data.chartingPlanned) {
    if (!text(data.chartingRationale)) {
      issues.push(issue('part4_charting_rationale_missing', 'A planned formal charting event requires a documented data/procedure rationale.', 4));
    }
    if (!lists.length && !chartingWords.length) issues.push(issue('part4_individual_charting_required', 'Charting is planned but separate named student lists or a source-controlled charting pool are missing.', 4));
    for (const raw of lists) {
      const list = asRecord(raw);
      const student = text(list?.studentName) || '(unnamed student)';
      const words = strings(list?.words);
      if (words.length !== 15) issues.push(issue('part4_student_charting_count_failed', 'Part 4 charting list for ' + student + ' must contain exactly 15 words; found ' + words.length + '.', 4));
    }
  } else {
    if (lists.length || chartingWords.length || text(data.chartingType)) {
      issues.push(issue('part4_unplanned_charting_payload', 'Part 4 is marked practice-only but still carries a formal charting payload.', 4));
    }
    if (!text(data.weeklyInstructionRationale)) {
      issues.push(issue('part4_practice_rationale_missing', 'Practice-only Part 4 requires a documented weekly instructional rationale.', 4));
    }
    const targets = Array.isArray(data.studentPracticeTargets) ? data.studentPracticeTargets : [];
    const targetNames = new Set<string>();
    for (const raw of targets) {
      const target = asRecord(raw);
      const student = text(target?.studentName);
      const words = strings(target?.words);
      if (!student || !text(target?.focus) || words.length < 1 || words.length > 3 || targetNames.has(student)) {
        issues.push(issue('part4_practice_targets_failed', 'Practice-only Part 4 requires unique named student targets with a stated focus and 1-3 listed practice words.', 4));
        break;
      }
      targetNames.add(student);
    }
    if (!targets.length) issues.push(issue('part4_practice_targets_failed', 'Practice-only Part 4 requires named student targets rather than a generic or formal reassessment.', 4));
  }
};

const validatePart5 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  if (!text(data.studentReader)) issues.push(issue('part5_reader_missing', 'Part 5 must name the exact Student Reader.', 5));
  if (!text(data.page)) issues.push(issue('part5_page_missing', 'Part 5 must name the exact sentence page.', 5));
  const sentences = strings(data.sentences);
  const questions = strings(data.weaveQuestions);
  const categories = strings(data.weaveQuestionCategories);
  if (sentences.length !== 10) issues.push(issue('part5_sentence_count_failed', 'Part 5 requires exactly 10 embedded sentences; found ' + sentences.length + '.', 5));
  if (questions.length !== 10) issues.push(issue('part5_weave_count_failed', 'Part 5 requires exactly 10 weave-in questions; found ' + questions.length + '.', 5));
  if (categories.length !== 10 || categories.some(category => !WEAVE_QUESTION_CATEGORIES.has(category))) {
    issues.push(issue('part5_weave_category_shape_failed', 'Part 5 must classify all ten weave questions as current-concept, cumulative-structure, vocabulary-meaning, syllable-word-structure, or phrasing-expression.', 5));
  } else {
    const missingCategories = [...WEAVE_QUESTION_CATEGORIES].filter(category => !categories.includes(category));
    if (missingCategories.length) issues.push(issue(
      'part5_weave_category_coverage_failed',
      'Part 5 weave questions must deliberately cover every required instructional attention category; missing ' + missingCategories.join(', ') + '.',
      5
    ));
  }
  if (questions.length === 10) {
    const stems = new Map<string, number>();
    for (const question of questions) {
      const stem = normalizedQuestionStem(question);
      stems.set(stem, (stems.get(stem) || 0) + 1);
    }
    const maxRepeatedStem = Math.max(...stems.values());
    const normalizedFullQuestions = new Set(questions.map(question => question.toLowerCase().replace(/\s+/g, ' ').trim()));
    if (maxRepeatedStem > 4 || normalizedFullQuestions.size < 6) {
      issues.push(issue('part5_weave_variety_failed', 'Part 5 weave questions repeat one mechanical question pattern instead of varying instructional attention.', 5));
    }
  }
};

const validMorePromptException = (part: RuntimeLessonPart, value: unknown) => {
  const exception = asRecord(value);
  const sourceIds = strings(exception?.sourceIds);
  return Boolean(
    exception &&
    Number(exception.approvedCount) > 20 &&
    text(exception.rationale) &&
    sourceIds.length &&
    sourceIds.every(sourceId => part.sourceIds.includes(sourceId))
  );
};

const validatePart6 = (part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const prompts = strings(data.quickDrillReverse ?? data.quickDrill);
  if (prompts.length !== 20 && !(prompts.length > 20 && validMorePromptException(part, data.morePromptException))) {
    issues.push(issue('part6_prompt_count_failed', 'Part 6 project standard requires exactly 20 fully selected sound prompts unless a validated source-based exception requires more; found ' + prompts.length + '.', 6));
  }
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

const dictationExceptionFor = (data: UnknownRecord, category: string) => {
  const exceptions = Array.isArray(data.dictationExceptions)
    ? data.dictationExceptions.map(asRecord).filter((entry): entry is UnknownRecord => Boolean(entry))
    : [];
  return exceptions.find(entry => text(entry.category) === category);
};

const hasValidPart8Source = (
  runtime: WRSRuntimeLessonPlan,
  part: RuntimeLessonPart,
  sourceIds: string[],
  allowedKinds: string[]
) => sourceIds.length > 0 && sourceIds.every(sourceId => part.sourceIds.includes(sourceId) && Boolean(sourceById(runtime, sourceId))) &&
  sourceIds.some(sourceId => allowedKinds.includes(sourceById(runtime, sourceId)?.kind || ''));

const validatePart8 = (runtime: WRSRuntimeLessonPlan, part: RuntimeLessonPart, issues: InstructionalContractIssue[]) => {
  const data = asRecord(part.data) || {};
  const dictation = asRecord(data.dictation);
  if (!dictation) {
    issues.push(issue('part8_dictation_missing', 'Part 8 dictation payload is missing.', 8));
    return;
  }
  if (!sourceIdsFor(part, runtime, 'dictation-book').length) {
    issues.push(issue('part8_dictation_source_missing', 'Part 8 must cite a Dictation Book source.', 8));
  }
  const expected: Record<string, number> = {
    sounds: 5,
    realWords: 5,
    nonsenseWords: 3,
    phrases: 3
  };
  for (const [key, count] of Object.entries(expected)) {
    const actual = strings(dictation[key]).length;
    if (actual !== count) issues.push(issue('part8_category_count_failed', 'Part 8 ' + key + ' requires exactly ' + count + ' items; found ' + actual + '.', 8));
  }
  if (typeof data.wordElementsApplicable !== 'boolean') {
    issues.push(issue('part8_word_elements_applicability_missing', 'Part 8 must explicitly state whether Word Elements are applicable at this instructional point.', 8));
  } else {
    const wordElements = strings(dictation.wordElements).length;
    const expectedWordElements = data.wordElementsApplicable ? 5 : 0;
    if (wordElements !== expectedWordElements) issues.push(issue('part8_word_elements_count_failed', 'Part 8 Word Elements require ' + expectedWordElements + ' items for this lesson; found ' + wordElements + '.', 8));
  }

  const categorySources = asRecord(data.dictationCategorySourceIds) || {};
  const sourceRequirements: Record<string, string[]> = {
    sounds: ['instructor-manual', 'dictation-book'],
    wordElements: ['instructor-manual', 'dictation-book'],
    realWords: ['dictation-book'],
    nonsenseWords: ['dictation-book', 'student-reader'],
    phrases: ['dictation-book'],
    sentences: ['dictation-book']
  };
  for (const [category, allowedKinds] of Object.entries(sourceRequirements)) {
    if (!hasValidPart8Source(runtime, part, strings(categorySources[category]), allowedKinds)) {
      issues.push(issue('part8_category_source_failed', 'Part 8 ' + category + ' must cite a registered, part-linked source of the required kind.', 8));
    }
  }

  const expectedSentenceCount = Number(data.expectedSentenceCount);
  if (expectedSentenceCount !== 2 && expectedSentenceCount !== 3) {
    issues.push(issue('part8_sentence_expectation_missing', 'Part 8 must explicitly set expectedSentenceCount to 2 or 3 from source/instructional need.', 8));
  } else {
    const actual = strings(dictation.sentences).length;
    if (actual !== expectedSentenceCount) issues.push(issue('part8_sentence_count_failed', 'Part 8 requires ' + expectedSentenceCount + ' sentences for this lesson; found ' + actual + '.', 8));
    if (expectedSentenceCount === 2) {
      const exception = dictationExceptionFor(data, 'sentences');
      const exceptionSourceIds = strings(exception?.sourceIds);
      if (!exception || Number(exception.allowedCount) !== 2 || !text(exception.rationale) ||
        !hasValidPart8Source(runtime, part, exceptionSourceIds, ['dictation-book'])) {
        issues.push(issue('part8_sentence_exception_failed', 'A two-sentence Part 8 requires an explicit Dictation Book-backed source/instructional exception.', 8));
      }
    }
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

  const p1 = partOf(runtime, 1); if (p1) validatePart1(runtime, p1, issues);
  const p2 = partOf(runtime, 2); if (p2) validatePart2(runtime, p2, issues);
  const p3 = partOf(runtime, 3); if (p3) validatePart3(runtime, p3, issues);
  const p4 = partOf(runtime, 4); if (p4) validatePart4(runtime, p4, issues);
  const p5 = partOf(runtime, 5); if (p5) validatePart5(p5, issues);
  const p6 = partOf(runtime, 6); if (p6) validatePart6(p6, issues);
  const p7 = partOf(runtime, 7); if (p7) validatePart7(runtime, p7, issues);
  const p8 = partOf(runtime, 8); if (p8) validatePart8(runtime, p8, issues);
  const p9 = partOf(runtime, 9); if (p9) validatePart9(p9, issues);
  const p10 = partOf(runtime, 10); if (p10) validatePart10(p10, issues);

  return {
    contractVersion: INSTRUCTIONAL_CONTRACT_VERSION,
    ok: !issues.some(item => item.severity === 'error'),
    issues
  };
};
