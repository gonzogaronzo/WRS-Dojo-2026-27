import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SentenceReading from '../legacy/components/modules/SentenceReading';
import PassageReading from '../legacy/components/modules/PassageReading';
import QuickDrill from '../legacy/components/modules/QuickDrill';
import Spelling from '../legacy/components/modules/Spelling';
import Part10Listening from '../legacy/components/modules/Part10Listening';
import Part7SpellingRunner, { part7SpellingItemsFromData } from '../legacy/components/modules/Part7SpellingRunner';
import { LessonRuntimeProvider } from '../legacy/components/lessonRuntimeContext';
import type { Lesson, RuntimeLessonPart } from '../legacy/types';

const part = (number: RuntimeLessonPart['part'], data: RuntimeLessonPart['data'] = {}): RuntimeLessonPart => ({
  part: number,
  title: 'Part ' + number,
  teacherDirections: [],
  sourceIds: number === 10 ? [] : ['source'],
  data
});

const lesson = (
  part5Data: Record<string, unknown>,
  part9Data: Record<string, unknown>,
  part6Data: Record<string, unknown> = {}
): Lesson => ({
  schemaVersion: 2,
  id: 'surface-test',
  title: 'Surface test',
  step: '2',
  substep: '5',
  conceptNotes: '',
  slides: [],
  quickDrill: [],
  wordCards: [],
  sentences: ['Grab some string so we can bind the two boxes.'],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [],
  affixPractice: [],
  passage: 'Spring is coming!',
  runtimePlan: {
    schemaVersion: 'wrs-runtime-v1',
    id: 'surface-test',
    title: 'Surface test',
    step: '2',
    substep: '5',
    focus: 'accuracy',
    lessonPath: 'full',
    plannedParts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    planningContext: { conceptsToWeave: '', troubleSpots: '' },
    sources: [{ id: 'source', label: 'Test source', kind: 'teacher-selection', locator: 'test only' }],
    parts: [
      part(1), part(2), part(3), part(4), part(5, part5Data),
      part(6, part6Data), part(7), part(8), part(9, part9Data), part(10)
    ]
  }
});

test('Part 5 weave question is visible to teacher but not student', () => {
  const currentLesson = lesson(
    { weaveQuestions: ['What three letters form the beginning blend in string?'] },
    {}
  );
  const teacher = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <SentenceReading sentences={currentLesson.sentences} />
    </LessonRuntimeProvider>
  );
  const student = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <SentenceReading sentences={currentLesson.sentences} readOnly />
    </LessonRuntimeProvider>
  );

  assert.match(teacher, /data-part5-teacher-weave/);
  assert.match(teacher, /What three letters form the beginning blend in string/);
  assert.doesNotMatch(student, /data-part5-teacher-weave/);
  assert.doesNotMatch(student, /What three letters form the beginning blend in string/);
  assert.match(student, /Grab some string so we can bind the two boxes/);
});

test('Part 6 keeps source responses and word elements in a distinct reveal-gated phase', () => {
  const currentLesson = lesson({}, {}, { wordElements: ['-struct-'] });
  const sharedItems = ['/old/ → old', 'word-element::-struct-'];
  const teacherWordElement = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <QuickDrill
        sounds={['/old/ → old']}
        isReverse
        currentIndex={1}
        shuffledItems={sharedItems}
      />
    </LessonRuntimeProvider>
  );
  const teacherSound = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <QuickDrill
        sounds={['/old/ → old']}
        isReverse
        currentIndex={0}
        shuffledItems={sharedItems}
      />
    </LessonRuntimeProvider>
  );
  const studentHidden = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <QuickDrill
        sounds={['/old/ → old']}
        isReverse
        currentIndex={1}
        revealedCount={0}
        shuffledItems={sharedItems}
        readOnly
      />
    </LessonRuntimeProvider>
  );
  const studentSoundHidden = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <QuickDrill
        sounds={['/old/ → old']}
        isReverse
        currentIndex={0}
        revealedCount={0}
        shuffledItems={sharedItems}
        readOnly
      />
    </LessonRuntimeProvider>
  );
  const studentWordElementRevealed = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <QuickDrill
        sounds={['/old/ → old']}
        isReverse
        currentIndex={1}
        revealedCount={1}
        shuffledItems={sharedItems}
        readOnly
      />
    </LessonRuntimeProvider>
  );
  const studentSoundRevealed = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <QuickDrill
        sounds={['/old/ → old']}
        isReverse
        currentIndex={0}
        revealedCount={1}
        shuffledItems={sharedItems}
        readOnly
      />
    </LessonRuntimeProvider>
  );

  assert.match(teacherSound, /data-testid="teacher-dictation-cue"/);
  assert.match(teacherSound, /data-part6-section="sounds"/);
  assert.match(teacherSound, />\/old\/<\/span>/);
  assert.match(teacherWordElement, /data-part6-section="word-elements"/);
  assert.match(teacherWordElement, /data-part6-word-element-procedure/);
  assert.match(teacherWordElement, /-struct-/);
  assert.match(studentSoundHidden, /data-part6-student-state="listen"/);
  assert.match(studentSoundHidden, />Listen<\/span>/);
  assert.doesNotMatch(studentSoundHidden, /\/old\//);
  assert.doesNotMatch(studentSoundHidden, />old</);
  assert.match(studentHidden, /data-part6-student-state="listen"/);
  assert.match(studentHidden, />Listen<\/span>/);
  assert.doesNotMatch(studentHidden, /-struct-/);
  assert.match(studentSoundRevealed, /data-part6-student-state="revealed"/);
  assert.match(studentSoundRevealed, />old<\/span>/);
  assert.match(studentWordElementRevealed, /data-part6-student-state="revealed"/);
  assert.match(studentWordElementRevealed, /-struct-/);
});

test('Part 9 keeps reading uncluttered, then exposes one shared question at a time', () => {
  const currentLesson = lesson({}, {
    passageTitle: 'The Spring Job',
    studentReader: 'Student Reader 2',
    page: '122-123',
    questions: [
      { question: 'What season is coming in the passage?', level: 'direct-recall' },
      { question: 'What message does the passage give?', level: 'synthesis' }
    ],
    historyStatus: 'uncertain-flagged',
    historyNote: 'Prior passage history is not inferred.'
  });
  const teacherReading = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <PassageReading text={currentLesson.passage || ''} />
    </LessonRuntimeProvider>
  );
  const teacherQuestionTwo = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <PassageReading text={currentLesson.passage || ''} phase="comprehension" questionIndex={1} />
    </LessonRuntimeProvider>
  );
  const studentReading = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <PassageReading text={currentLesson.passage || ''} readOnly />
    </LessonRuntimeProvider>
  );
  const studentQuestionTwo = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <PassageReading text={currentLesson.passage || ''} phase="comprehension" questionIndex={1} readOnly />
    </LessonRuntimeProvider>
  );

  assert.match(teacherReading, /data-part9-reading-flow="passage"/);
  assert.match(teacherReading, /data-part9-begin-comprehension/);
  assert.doesNotMatch(teacherReading, /What season is coming in the passage/);
  assert.doesNotMatch(teacherReading, /Prior passage history is not inferred/);
  assert.match(teacherQuestionTwo, /data-part9-reading-flow="comprehension"/);
  assert.match(teacherQuestionTwo, /data-part9-teacher-history/);
  assert.match(teacherQuestionTwo, /What message does the passage give/);
  assert.doesNotMatch(teacherQuestionTwo, /What season is coming in the passage/);
  assert.match(studentReading, /The Spring Job/);
  assert.match(studentReading, /Spring is coming/);
  assert.doesNotMatch(studentReading, /What season is coming in the passage/);
  assert.doesNotMatch(studentReading, /Prior passage history is not inferred/);
  assert.match(studentQuestionTwo, /What message does the passage give/);
  assert.doesNotMatch(studentQuestionTwo, /Prior passage history is not inferred/);
});

test('Part 8 gates every dictation section behind explicit reveal and hides prior answers on next item', () => {
  const dictation = {
    sounds: ['/zēph/ → ck'],
    wordElements: ['-morph-'],
    realWords: ['brindle'],
    nonsenseWords: ['splont'],
    phrases: ['carry the lantern'],
    sentences: ['The silver lantern blinked twice.']
  };
  const cases = [
    { tab: 0, key: 'sounds', teacherCue: '/zēph/', answer: '>ck</span>', revealKind: 'sound' },
    { tab: 1, key: 'word-elements', teacherCue: '-morph-', answer: '-morph-', revealKind: 'word-element' },
    { tab: 2, key: 'real-words', teacherCue: 'brindle', answer: 'brindle' },
    { tab: 3, key: 'nonsense-words', teacherCue: 'splont', answer: 'splont' },
    { tab: 4, key: 'phrases', teacherCue: 'carry the lantern', answer: 'carry the lantern' },
    { tab: 5, key: 'sentences', teacherCue: 'The silver lantern blinked twice.', answer: 'The silver lantern blinked twice.' }
  ];

  const teacherOrder = renderToStaticMarkup(<Spelling data={dictation} activeTab={0} />);
  assert.ok(teacherOrder.indexOf('Sounds') < teacherOrder.indexOf('Word Elements'));
  assert.ok(teacherOrder.indexOf('Word Elements') < teacherOrder.indexOf('Real Words'));
  assert.ok(teacherOrder.indexOf('Real Words') < teacherOrder.indexOf('Nonsense Words'));
  assert.ok(teacherOrder.indexOf('Nonsense Words') < teacherOrder.indexOf('Phrases'));
  assert.ok(teacherOrder.indexOf('Phrases') < teacherOrder.indexOf('Sentences'));

  for (const item of cases) {
    const currentMarker = '__part8-current__:' + item.key + '-0';
    const teacher = renderToStaticMarkup(
      <Spelling data={dictation} activeTab={item.tab} revealedItems={{ [currentMarker]: true }} />
    );
    const studentHidden = renderToStaticMarkup(
      <Spelling data={dictation} activeTab={item.tab} revealedItems={{ [currentMarker]: true }} readOnly />
    );
    const studentRevealed = renderToStaticMarkup(
      <Spelling
        data={dictation}
        activeTab={item.tab}
        revealedItems={{ [currentMarker]: true, [item.key + '-0']: true }}
        readOnly
      />
    );

    assert.match(teacher, /data-testid="teacher-dictation-cue"/);
    assert.ok(teacher.includes(item.teacherCue));
    assert.match(teacher, /data-part8-teacher-control="reveal"/);
    assert.match(studentHidden, /data-part8-item-state="listen-write"/);
    assert.match(studentHidden, /Listen and write/);
    assert.equal(studentHidden.includes(item.teacherCue), false);
    assert.equal(studentHidden.includes(item.answer), false);
    assert.match(studentRevealed, /data-part8-item-state="revealed"/);
    assert.ok(studentRevealed.includes(item.answer));
    if (item.revealKind) assert.ok(studentRevealed.includes('data-part8-reveal-kind="' + item.revealKind + '"'));
  }

  const twoWordDictation = { ...dictation, realWords: ['brindle', 'cavern'] };
  const nextItemHidden = renderToStaticMarkup(
    <Spelling
      data={twoWordDictation}
      activeTab={2}
      revealedItems={{
        '__part8-current__:real-words-1': true,
        'real-words-0': true
      }}
      readOnly
    />
  );
  const nextItemRevealed = renderToStaticMarkup(
    <Spelling
      data={twoWordDictation}
      activeTab={2}
      revealedItems={{
        '__part8-current__:real-words-1': true,
        'real-words-0': true,
        'real-words-1': true
      }}
      readOnly
    />
  );

  assert.match(nextItemHidden, /data-part8-item-index="1" data-part8-item-state="listen-write"/);
  assert.equal(nextItemHidden.includes('brindle'), false);
  assert.equal(nextItemHidden.includes('cavern'), false);
  assert.match(nextItemRevealed, /data-part8-item-index="1" data-part8-item-state="revealed"/);
  assert.equal(nextItemRevealed.includes('brindle'), false);
  assert.ok(nextItemRevealed.includes('cavern'));
});

test('Part 10 stays source-gated and keeps teacher directions off the student display', () => {
  const plan = {
    mode: 'teacher-selected' as const,
    title: 'Teacher selection',
    teacherDirections: ['Read the selected text aloud.'],
    studentPrompt: 'Listen and prepare to retell what you heard.',
    sourceIds: ['teacher-selection']
  };
  const teacherReady = renderToStaticMarkup(<Part10Listening plan={plan} onOpenDossier={() => undefined} />);
  const studentReady = renderToStaticMarkup(<Part10Listening plan={plan} readOnly />);
  const teacherBlocked = renderToStaticMarkup(<Part10Listening onOpenDossier={() => undefined} />);

  assert.match(teacherReady, /data-part10-status="ready"/);
  assert.match(teacherReady, /Read the selected text aloud/);
  assert.match(teacherReady, /data-part10-open-dossier/);
  assert.match(studentReady, /Listen and prepare to retell/);
  assert.doesNotMatch(studentReady, /Read the selected text aloud/);
  assert.doesNotMatch(studentReady, /Teacher selection/);
  assert.match(teacherBlocked, /data-part10-status="blocked"/);
  assert.match(teacherBlocked, /No Part 10 text or student prompt was supplied/);
});

const spellingData = {
  spellingItems: [
    {
      id: 'strap',
      word: 'strap',
      group: 'current',
      representation: 'letter-sound-tiles',
      units: [
        { text: 's', role: 'consonant' },
        { text: 't', role: 'consonant' },
        { text: 'r', role: 'consonant' },
        { text: 'a', role: 'vowel' },
        { text: 'p', role: 'consonant' }
      ]
    },
    {
      id: 'sunset',
      word: 'sunset',
      group: 'current',
      representation: 'syllable-cards',
      units: [
        { text: 'sun', role: 'syllable' },
        { text: 'set', role: 'syllable' }
      ]
    },
    {
      id: 'suffix-ing',
      word: '-ing',
      group: 'word-element',
      representation: 'prefix-suffix-cards',
      units: [{ text: '-ing', role: 'suffix' }]
    }
  ]
};

test('Part 7 uses explicit source-owned representations and rejects inferred/malformed affixes', () => {
  const items = part7SpellingItemsFromData(spellingData);
  assert.ok(items);
  assert.deepEqual(items.map(item => item.representation), [
    'letter-sound-tiles',
    'syllable-cards',
    'prefix-suffix-cards'
  ]);

  const malformedSuffix = JSON.parse(JSON.stringify(spellingData));
  malformedSuffix.spellingItems[2].units[0].text = 'ing';
  assert.equal(part7SpellingItemsFromData(malformedSuffix), null);

  const missingRepresentation = JSON.parse(JSON.stringify(spellingData));
  delete missingRepresentation.spellingItems[0].representation;
  assert.equal(part7SpellingItemsFromData(missingRepresentation), null);
});

test('Part 7 hides the target until reveal and uses Wilson semantic card roles', () => {
  const items = part7SpellingItemsFromData(spellingData);
  assert.ok(items);

  const teacherHidden = renderToStaticMarkup(<Part7SpellingRunner items={items} activeIndex={0} />);
  const studentHidden = renderToStaticMarkup(<Part7SpellingRunner items={items} activeIndex={0} readOnly />);
  const studentRevealed = renderToStaticMarkup(
    <Part7SpellingRunner items={items} activeIndex={0} revealedItems={{ 0: true }} readOnly />
  );
  const affixRevealed = renderToStaticMarkup(
    <Part7SpellingRunner items={items} activeIndex={2} revealedItems={{ 2: true }} readOnly />
  );

  assert.match(teacherHidden, /data-part7-target-private/);
  assert.match(teacherHidden, />strap</);
  assert.match(studentHidden, />Listen</);
  assert.doesNotMatch(studentHidden, /data-part7-target-private/);
  assert.doesNotMatch(studentHidden, />strap</);
  assert.match(studentRevealed, /data-part2-role="consonant"/);
  assert.match(studentRevealed, /data-part2-role="vowel"/);
  assert.match(studentRevealed, />s</);
  assert.match(studentRevealed, />a</);
  assert.match(affixRevealed, /data-part2-role="suffix"/);
  assert.match(affixRevealed, /data-wrs-visual="affix"/);
  assert.match(affixRevealed, /-ing/);
  assert.doesNotMatch(teacherHidden, /Quick Practice|Cipher/i);
});
