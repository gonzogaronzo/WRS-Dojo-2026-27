import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, MousePointer2, PenTool, RotateCcw, Save, Trash2, X } from 'lucide-react';
import Tile from '../Tile';
import Draggable from '../interactive/Draggable';
import { useLessonStageScale } from '../LessonStage';
import CodingTray, { CodingMark } from './CodingTray';
import CodingMarkContent from '../CodingMarkContent';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';
import { generateId } from '../../utils';
import {
  encodePart2SemanticUnit,
  isPart2BuildAction,
  type Part2InstructionObject,
  type Part2InstructionStep,
  type Part2InteractivePresentation
} from '../../part2Presentation';
import {
  createPart2SavePayload,
  nextPart2Step,
  previousPart2Step,
  upsertPart2SavePayloadInNotes
} from '../../part2StepRunner';

interface RunnerObjectState {
  x: number;
  y: number;
  scale: number;
  placed?: boolean;
}

interface RunnerMetaState extends RunnerObjectState {
  activeWordIndex?: number;
}

type RunnerStoredState = RunnerMetaState;
type RunnerStateMap = Record<number, Record<string, RunnerStoredState>>;

interface Part2InteractiveRunnerProps {
  presentation: Part2InteractivePresentation;
  activeStepIndex?: number;
  onUpdateActiveStepIndex?: (index: number) => void;
  objectStates?: RunnerStateMap;
  onUpdateObjectStates?: (states: RunnerStateMap) => void;
  notes?: string;
  onUpdateNotes?: (notes: string) => void;
  drawingStrokes?: DrawingStroke[];
  onUpdateDrawingStrokes?: (strokes: DrawingStroke[]) => void;
  drawingTool?: 'cursor' | 'pen';
  onUpdateDrawingTool?: (tool: 'cursor' | 'pen') => void;
  marks?: CodingMark[];
  onUpdateMarks?: (marks: CodingMark[]) => void;
  showMarkingTools?: boolean;
  onToggleMarkingTools?: () => void;
  readOnly?: boolean;
}

const RUNNER_META_KEY = '__part2_runner_meta__';

const clampIndex = (index: number, length: number) => Math.max(0, Math.min(Math.max(0, length - 1), index));
const objectKey = (stepId: string, objectId: string) => `part2:${stepId}:${objectId}`;

const readObjectState = (value: unknown, fallback: RunnerObjectState): RunnerObjectState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  return {
    x: typeof record.x === 'number' ? record.x : fallback.x,
    y: typeof record.y === 'number' ? record.y : fallback.y,
    scale: typeof record.scale === 'number' ? record.scale : fallback.scale,
    placed: record.placed === true
  };
};

const readRunnerMetaState = (value: unknown): RunnerMetaState => {
  const fallback = { x: 0, y: 0, scale: 1 };
  const base = readObjectState(value, fallback);
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    ...base,
    activeWordIndex: typeof record.activeWordIndex === 'number' && Number.isInteger(record.activeWordIndex)
      ? Math.max(0, record.activeWordIndex)
      : undefined
  };
};

const semanticTile = (object: Part2InstructionObject) => ({
  text: encodePart2SemanticUnit(object.role, object.text),
  type: 'syllable' as const
});

/**
 * Renders only source-supplied page structure. There is deliberately no
 * prose-to-layout fallback: a payload without a verified visual is visibly
 * unavailable instead of inventing a notebook page.
 */
const NotebookPage: React.FC<{ step: Part2InstructionStep }> = ({ step }) => {
  const visual = step.notebookVisual;
  if (!visual || visual.layout !== 'sound-entry-grid') {
    return (
      <article data-part2-notebook-page-unavailable className="absolute inset-x-[255px] top-[120px] z-20 mx-auto max-w-[900px] rounded-2xl border-2 border-amber-200 bg-amber-50 px-10 py-8 text-center text-stone-700">
        <p className="text-2xl font-black text-stone-800">Notebook page view unavailable</p>
        <p className="mt-2 text-lg">Wait for the teacher’s source-verified notebook guidance.</p>
      </article>
    );
  }

  return (
    <article data-part2-notebook-page className="absolute left-1/2 top-[64px] z-20 w-[980px] -translate-x-1/2 rounded-[28px] border-[10px] border-[#d7c5a6] bg-[#fffdf6] p-8 text-stone-900 shadow-[0_18px_45px_rgba(63,47,28,0.18)]">
      <header className="border-b-2 border-stone-300 pb-4 text-center">
        <div className="flex items-center justify-between gap-5 text-[13px] font-black uppercase tracking-[0.15em] text-stone-500">
          <span data-part2-notebook-section>{visual.section}</span>
          <span data-part2-notebook-page-number>Page {visual.pageNumber}</span>
        </div>
        <h2 data-part2-notebook-subheading className="mt-2 text-[30px] font-black tracking-tight text-stone-800">{visual.subheading}</h2>
      </header>
      <div data-part2-notebook-entry-grid className="mt-6 space-y-3">
        {visual.rows.map(row => row.kind === 'reference-panel' ? (
          <section
            key={row.id}
            data-part2-notebook-reference-panel
            data-notebook-source-order={row.sourceOrder}
            className={`rounded-xl border border-stone-300 px-5 py-4 text-center text-[16px] font-black uppercase tracking-[0.16em] ${row.shaded ? 'bg-stone-200 text-stone-600' : 'bg-white text-stone-700'}`}
          >
            {row.label}
          </section>
        ) : (
          <section
            key={row.id}
            data-part2-notebook-row
            data-notebook-source-order={row.sourceOrder}
            {...(row.target ? { 'data-part2-notebook-target-row': 'true' } : {})}
            className={`grid min-h-[128px] grid-cols-[180px_1fr_160px] items-stretch overflow-hidden rounded-xl border-2 ${row.target ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-100' : 'border-stone-300 bg-white'}`}
          >
            <div className="flex items-center justify-center border-r-2 border-stone-300 px-4 text-[48px] font-black tracking-tight text-stone-800">{row.pattern}</div>
            <div className="flex min-w-0 flex-col items-center justify-center px-5 text-center">
              {row.visualCue ? <div data-part2-notebook-source-visual className="mb-1 rounded-full border border-stone-300 bg-[#f5eee2] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-stone-600">Visual cue · {row.visualCue}</div> : null}
              <div className="text-[27px] font-black text-stone-800">{row.keyword}{row.stepLabel ? <span className="ml-2 text-[15px] font-bold text-stone-500">({row.stepLabel})</span> : null}</div>
            </div>
            <div className="flex items-center justify-center border-l-2 border-stone-300 px-4 text-[34px] font-black text-stone-800">{row.sound}</div>
          </section>
        ))}
      </div>
    </article>
  );
};

const compactButtonClass = 'rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-stone-700 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35';
const standardButtonClass = 'rounded-xl border border-stone-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-stone-700 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35';

const Part2InteractiveRunner: React.FC<Part2InteractiveRunnerProps> = ({
  presentation,
  activeStepIndex,
  onUpdateActiveStepIndex,
  objectStates,
  onUpdateObjectStates,
  notes,
  onUpdateNotes,
  drawingStrokes,
  onUpdateDrawingStrokes,
  drawingTool,
  onUpdateDrawingTool,
  marks,
  onUpdateMarks,
  showMarkingTools,
  onToggleMarkingTools,
  readOnly = false
}) => {
  const [localIndex, setLocalIndex] = useState(0);
  const [localStates, setLocalStates] = useState<RunnerStateMap>({});
  const [boardSafe, setBoardSafe] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [troubleSpots, setTroubleSpots] = useState('');
  const [instructionalNote, setInstructionalNote] = useState('');
  const [tagCurrentStep, setTagCurrentStep] = useState(true);
  const [saved, setSaved] = useState(false);
  const [localDrawingTool, setLocalDrawingTool] = useState<'cursor' | 'pen'>('cursor');
  const [localMarks, setLocalMarks] = useState<CodingMark[]>([]);
  const [localMarkingToolsVisible, setLocalMarkingToolsVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [contentScale, setContentScale] = useState(1);
  const lessonStageScale = useLessonStageScale();

  const stepCount = presentation.steps.length;
  const resolvedIndex = clampIndex(activeStepIndex ?? localIndex, stepCount);
  const activeStep = presentation.steps[resolvedIndex];
  const stateMap = objectStates ?? localStates;
  const activeStates = stateMap[resolvedIndex] || {};
  const meta = readRunnerMetaState(activeStates[RUNNER_META_KEY]);
  const showTeacherPrivate = !readOnly && !boardSafe;
  const buttonClass = boardSafe ? compactButtonClass : standardButtonClass;
  const activeDrawingTool = drawingTool ?? localDrawingTool;
  const markingToolsVisible = showMarkingTools ?? localMarkingToolsVisible;
  const activeMarks = marks ?? localMarks;
  const visibleMarks = activeMarks.filter((mark): mark is CodingMark => Boolean(mark?.id));
  const syncedDrawing = useSyncedDrawingCanvas({
    strokes: drawingStrokes,
    onUpdateStrokes: onUpdateDrawingStrokes,
    tool: activeDrawingTool,
    lineWidth: 6,
    readOnly
  });

  const setRunnerDrawingTool = (next: 'cursor' | 'pen') => {
    if (onUpdateDrawingTool) onUpdateDrawingTool(next);
    else setLocalDrawingTool(next);
  };

  const replaceMarks = (next: CodingMark[]) => {
    if (onUpdateMarks) onUpdateMarks(next);
    else setLocalMarks(next);
  };

  const toggleMarkingTools = () => {
    if (onToggleMarkingTools) onToggleMarkingTools();
    else setLocalMarkingToolsVisible(value => !value);
  };

  useEffect(() => {
    const measure = () => {
      const node = stageRef.current;
      if (!node) return;
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (!width || !height) return;
      setContentScale(Math.min(width / 1600, height / 900));
    };
    const node = stageRef.current;
    const observer = node && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(node!);
    measure();
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const replaceStates = (next: RunnerStateMap) => {
    if (onUpdateObjectStates) onUpdateObjectStates(next);
    else setLocalStates(next);
  };

  const updateCurrentState = (key: string, updates: Partial<RunnerMetaState>) => {
    const current = key === RUNNER_META_KEY
      ? readRunnerMetaState(activeStates[key])
      : readObjectState(activeStates[key], { x: 0, y: 0, scale: 1 });
    replaceStates({
      ...stateMap,
      [resolvedIndex]: {
        ...activeStates,
        [key]: {
          ...current,
          ...updates
        }
      }
    });
  };

  const clearCurrentWorkspace = () => {
    if (!activeStep || activeStep.kind === 'invalid') return;
    const nextActive = { ...activeStates };
    for (const key of Object.keys(nextActive)) {
      if (key.startsWith(`part2:${activeStep.id}:`)) delete nextActive[key];
    }
    delete nextActive[RUNNER_META_KEY];
    replaceStates({ ...stateMap, [resolvedIndex]: nextActive });
  };

  const setIndex = (next: number) => {
    const safe = clampIndex(next, stepCount);
    if (onUpdateActiveStepIndex) onUpdateActiveStepIndex(safe);
    else setLocalIndex(safe);
  };


  const savePart2 = () => {
    if (!onUpdateNotes || !activeStep || activeStep.kind === 'invalid') return;
    const payload = createPart2SavePayload({
      completed,
      troubleSpots,
      note: instructionalNote,
      stepId: tagCurrentStep ? activeStep.id : undefined
    });
    onUpdateNotes(upsertPart2SavePayloadInNotes(notes, payload));
    setSaved(true);
  };

  if (!activeStep || activeStep.kind === 'invalid') {
    const reason = activeStep?.kind === 'invalid' ? activeStep.reason : 'Part 2 interactive source data is unavailable.';
    return (
      <div data-part2-runner-unavailable className="h-full min-h-[420px] bg-stone-50 p-10 flex items-center justify-center">
        <div className="max-w-xl rounded-2xl border-2 border-red-200 bg-red-50 px-8 py-7 text-center">
          <p className="text-2xl font-black text-red-950">Instructional display unavailable.</p>
          {!readOnly && <details className="mt-4 text-left text-sm text-red-900"><summary className="cursor-pointer font-bold">Teacher details</summary><p className="mt-2">{reason}</p></details>}
        </div>
      </div>
    );
  }

  const buildStep = isPart2BuildAction(activeStep.actionType);
  const orderedObjects = [...activeStep.objects].sort((left, right) => (left.stagingOrder || 0) - (right.stagingOrder || 0));
  const usesWordSequence = activeStep.actionType === 'TEACH_CARD'
    && activeStep.displayType === 'WRITTEN_WORD'
    && orderedObjects.length > 0
    && orderedObjects.every(object => object.role === 'word');
  const activeWordIndex = usesWordSequence ? clampIndex(meta.activeWordIndex ?? 0, orderedObjects.length) : 0;
  const activeWord = usesWordSequence ? orderedObjects[activeWordIndex] : undefined;
  const visibleStaticObjects = usesWordSequence ? (activeWord ? [activeWord] : []) : orderedObjects;
  const unplaced = orderedObjects.filter(object => !readObjectState(
    activeStates[objectKey(activeStep.id, object.id)],
    { x: 0, y: 0, scale: 1 }
  ).placed);
  const topStagedId = unplaced[0]?.id;
  const displayCue = activeStep.teacherCue;
  // Notebook layout itself is the student-facing guide. Location prose remains
  // teacher-private, and build/read/manipulation prompts are source-gated away.
  const studentFacingPrompt = activeStep.actionType === 'MARK_WORDS'
    ? activeStep.studentPrompt
    : undefined;

  const setActiveWordIndex = (next: number) => {
    if (!usesWordSequence) return;
    updateCurrentState(RUNNER_META_KEY, { activeWordIndex: clampIndex(next, orderedObjects.length) });
  };

  const navigate = (direction: 'back' | 'next' | 'skip') => {
    // The runner owns navigation.  A review-word move consumes its one Next
    // control before advancing the source-owned instructional move.
    if (direction === 'next' && usesWordSequence && activeWordIndex < orderedObjects.length - 1) {
      setActiveWordIndex(activeWordIndex + 1);
      return;
    }
    if (direction === 'back' && usesWordSequence && activeWordIndex > 0) {
      setActiveWordIndex(activeWordIndex - 1);
      return;
    }
    const next = direction === 'back'
      ? previousPart2Step({ activeIndex: resolvedIndex }, stepCount)
      : nextPart2Step({ activeIndex: resolvedIndex }, stepCount);
    setIndex(next.activeIndex);
  };

  const hasPreviousRunnerTarget = resolvedIndex > 0 || (usesWordSequence && activeWordIndex > 0);
  const hasNextRunnerTarget = resolvedIndex < stepCount - 1 || (usesWordSequence && activeWordIndex < orderedObjects.length - 1);

  const spawnMark = (type: CodingMark['type']) => {
    const mark: CodingMark = {
      id: generateId(),
      type,
      x: 770,
      y: 385,
      scale: 1.25
    };
    replaceMarks([...activeMarks, mark]);
  };

  const updateMark = (id: string, updates: Partial<CodingMark>) => {
    replaceMarks(activeMarks.map(mark => mark.id === id ? { ...mark, ...updates } : mark));
  };

  const removeMark = (id: string) => {
    replaceMarks(activeMarks.filter(mark => mark.id !== id));
  };

  const renderObject = (object: Part2InstructionObject, objectIndex: number, dominantReviewWord = false) => {
    const key = objectKey(activeStep.id, object.id);
    const defaultStack = {
      x: 105,
      y: 118 + Math.max(0, (object.stagingOrder || objectIndex + 1) - 1) * 18,
      scale: 1,
      placed: false
    };
    const workRowStart = 800 - (Math.max(1, orderedObjects.length) * 205) / 2;
    const defaultWork = dominantReviewWord
      ? { x: 620, y: 360, scale: 1, placed: true }
      : { x: workRowStart + objectIndex * 205, y: 410, scale: 1, placed: true };
    const fallback = buildStep ? defaultStack : defaultWork;
    const state = readObjectState(activeStates[key], fallback);
    const placed = !buildStep || state.placed;
    const isTopStaged = buildStep && !placed && object.id === topStagedId;
    const movable = object.interaction !== 'static' && activeStep.actionType !== 'NOTEBOOK';
    const dragEnabled = movable && !readOnly && (!buildStep || placed || isTopStaged);

    if (readOnly && !placed) return null;
    const surface = (
      <div
        data-part2-manipulative
        data-part2-draggable={movable ? 'true' : 'false'}
        data-part2-drag-enabled={dragEnabled ? 'true' : 'false'}
        data-part2-object-id={object.id}
        data-part2-role={object.role}
        {...(dominantReviewWord ? {
          'data-part2-review-card': 'true',
          'data-part2-active-word': 'true',
          'data-part2-word-index': objectIndex + 1
        } : {})}
        {...(!placed ? { 'data-staging-order': object.stagingOrder || objectIndex + 1 } : {})}
        className={`rounded-xl ${!placed ? 'bg-white/85 p-1 shadow-lg' : 'bg-transparent p-0'} ${dominantReviewWord ? 'origin-center scale-[1.45]' : ''}`}
      >
        <Tile data={semanticTile(object)} size="xl" />
      </div>
    );

    if (!movable) {
      return (
        <div
          key={key}
          className="absolute"
          style={{ left: state.x, top: state.y, zIndex: placed ? 30 + objectIndex : 200 - (object.stagingOrder || objectIndex) }}
        >
          {surface}
        </div>
      );
    }

    return (
      <Draggable
        key={key}
        initialPos={{ x: state.x, y: state.y }}
        viewportScale={contentScale * lessonStageScale}
        disabled={!dragEnabled}
        onDrag={position => updateCurrentState(key, { ...position, placed: true })}
        onDragEnd={position => updateCurrentState(key, { ...position, placed: true })}
        className={readOnly ? 'pointer-events-none' : ''}
        style={{ zIndex: placed ? 30 + objectIndex : 200 - (object.stagingOrder || objectIndex) }}
      >
        {surface}
      </Draggable>
    );
  };

  return (
    <section data-part2-interactive-runner className="h-full min-h-[500px] flex flex-col bg-[#fcfbf9] text-stone-900 overflow-hidden">
      {!readOnly && (
        <header className={`relative z-30 border-b border-stone-200 bg-white/95 ${boardSafe ? 'px-3 py-2' : 'px-5 py-4'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Part 2 · move {resolvedIndex + 1} of {stepCount}</p>
              {!boardSafe && <p data-part2-teacher-cue className="mt-1 text-base font-bold text-stone-800">{displayCue}</p>}
            </div>
            <div data-part2-runner-controls className="flex flex-wrap items-center gap-2">
              <button type="button" className={buttonClass} onClick={() => navigate('back')} disabled={!hasPreviousRunnerTarget} aria-label="Back"><ChevronLeft className="inline h-3.5 w-3.5" /> Back</button>
              <button type="button" className={buttonClass} onClick={() => navigate('next')} disabled={!hasNextRunnerTarget} aria-label="Next" data-part2-next-scope={usesWordSequence && activeWordIndex < orderedObjects.length - 1 ? 'review-word' : 'instructional-move'}>Next <ChevronRight className="inline h-3.5 w-3.5" /></button>
              <button type="button" className={buttonClass} onClick={clearCurrentWorkspace} aria-label="Repeat current instructional move"><RotateCcw className="inline h-3.5 w-3.5" /> Repeat</button>
              <button type="button" className={buttonClass} onClick={() => navigate('skip')} disabled={resolvedIndex >= stepCount - 1} aria-label="Skip current instructional move">Skip</button>
              <button type="button" className={buttonClass} onClick={() => setBoardSafe(value => !value)} aria-label="Toggle board-safe projection">
                {boardSafe ? <><Eye className="inline h-3.5 w-3.5" /> Teacher</> : <><EyeOff className="inline h-3.5 w-3.5" /> Board-safe</>}
              </button>
            </div>
          </div>
          {showTeacherPrivate && (
            <div className="mt-3 flex flex-wrap items-start gap-3">
              <details data-part2-teacher-directions className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-700">
                <summary className="cursor-pointer font-black uppercase tracking-[0.1em] text-stone-600">Full source directions</summary>
                <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">{activeStep.teacherDirections.map((direction, index) => <li key={`${activeStep.id}-direction-${index}`}>{direction}</li>)}</ol>
              </details>
              {activeStep.actionType === 'NOTEBOOK' && (
                <details data-part2-notebook-note className="max-w-2xl rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                  <summary className="cursor-pointer font-black uppercase tracking-[0.1em] text-sky-800">Notebook source details</summary>
                  <dl className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-[5.5rem_1fr]">
                    {activeStep.notebookContext?.pageNumber && <><dt className="font-bold">Page</dt><dd>{activeStep.notebookContext.pageNumber}</dd></>}
                    {activeStep.notebookContext?.section && <><dt className="font-bold">Section</dt><dd>{activeStep.notebookContext.section}</dd></>}
                    {activeStep.notebookContext?.subheading && <><dt className="font-bold">Subheading</dt><dd>{activeStep.notebookContext.subheading}</dd></>}
                    <dt className="font-bold">Where</dt>
                    <dd>{activeStep.notebookContext?.pageLocation || activeStep.notebookContext?.location || 'Notebook location is not verified in this source payload; do not infer a page or layout.'}</dd>
                    {activeStep.notebookContext?.nearbyContext?.length ? <><dt className="font-bold">Nearby</dt><dd><ul className="list-disc space-y-0.5 pl-4">{activeStep.notebookContext.nearbyContext.map((context, index) => <li key={`${activeStep.id}-nearby-${index}`}>{context}</li>)}</ul></dd></> : null}
                    <dt className="font-bold">Entry</dt>
                    <dd>{activeStep.notebookContext?.entryAppearance || 'Unavailable from this source payload; do not invent the entry form.'}</dd>
                    <dt className="font-bold">Why now</dt>
                    <dd>{activeStep.notebookContext?.purpose || 'Unavailable from this source payload; confirm the instructional purpose in the cited source.'}</dd>
                    {activeStep.notebookContext?.visualReference && <><dt className="font-bold">Source visual</dt><dd>{activeStep.notebookContext.visualReference}</dd></>}
                  </dl>
                </details>
              )}
              {activeStep.wordElementMeanings?.some(entry => entry.sourceContext) && (
                <aside data-part2-word-element-source-context className="max-w-2xl rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
                  <p className="font-black uppercase tracking-[0.1em] text-violet-800">Word Element Answer Key</p>
                  <ul className="mt-1 space-y-2">
                    {activeStep.wordElementMeanings.filter(entry => entry.sourceContext).map(entry => {
                      const context = entry.sourceContext!;
                      return <li key={`${activeStep.id}-${entry.objectId}`}><span className="font-bold">{entry.objectId}</span>{context.pageNumber ? ` · p. ${context.pageNumber}` : ''}{context.section ? ` · ${context.section}` : ''}{context.subheading ? ` · ${context.subheading}` : ''}{context.pageLocation ? ` · ${context.pageLocation}` : ''}{context.visualReference ? ` · Source visual: ${context.visualReference}` : ''}</li>;
                    })}
                  </ul>
                </aside>
              )}
              {activeStep.sourceSection === 'subsequent-lessons' && activeStep.projectPacingRule && (
                <span data-part2-project-pacing className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Project pacing: introduce this source-ordered Subsequent Lessons move in the current Introduction lesson.</span>
              )}
            </div>
          )}
        </header>
      )}

      <div ref={stageRef} className="flex-1 min-h-0 relative overflow-hidden bg-stone-100" data-part2-stage-viewport>
        {!readOnly && (
          <div data-part2-drawing-tools className={`absolute left-3 top-3 z-[70] flex max-h-[calc(100%-1.5rem)] flex-col items-center gap-1 overflow-y-auto rounded-2xl border p-1.5 shadow-xl backdrop-blur-md ${activeStep.actionType === 'MARK_WORDS' ? 'border-red-200 bg-white/95' : 'border-stone-200 bg-white/85'}`}>
            <button
              type="button"
              onClick={() => setRunnerDrawingTool('cursor')}
              className={`rounded-xl p-3 transition-colors ${activeDrawingTool === 'cursor' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
              title="Move cards and marks"
              aria-label="Use cursor to move Part 2 cards and marks"
            >
              <MousePointer2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setRunnerDrawingTool('pen')}
              className={`rounded-xl p-3 transition-colors ${activeDrawingTool === 'pen' ? 'bg-red-700 text-white' : 'text-red-700 hover:bg-red-50'}`}
              title="Draw or underline on this Part 2 step"
              aria-label="Draw or underline on the active Part 2 step"
            >
              <PenTool className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleMarkingTools}
              className={`rounded-xl px-2 py-2 text-[8px] font-black uppercase tracking-[0.08em] transition-colors ${markingToolsVisible ? 'bg-emerald-100 text-emerald-900' : 'text-stone-500 hover:bg-stone-100'}`}
              title="Show or hide Wilson coding marks"
              aria-label="Toggle Wilson coding marks"
            >
              Code
            </button>
            {markingToolsVisible && (
              <CodingTray
                onSpawnMark={spawnMark}
                onClearMarks={() => replaceMarks([])}
                vertical
                initiallyCollapsed={false}
              />
            )}
            <div className="my-0.5 h-px w-8 bg-stone-200" />
            <button
              type="button"
              onClick={() => syncedDrawing.clear()}
              className="rounded-xl p-3 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
              title="Clear drawing on this Part 2 step"
              aria-label="Clear drawing on the active Part 2 step"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => replaceMarks([])}
              className="rounded-xl p-3 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
              title="Clear Wilson coding marks on this Part 2 step"
              aria-label="Clear Wilson coding marks on the active Part 2 step"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="relative h-px w-px" style={{ transform: `scale(${contentScale})` }}>
            <div
              data-part2-live-work-area
              {...(activeStep.actionType === 'MARK_WORDS' ? { 'data-part2-marking-surface': 'true' } : {})}
              className="relative h-[900px] w-[1600px] -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-stone-200 bg-[#fcfbf9]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8f7f4_100%)]" />
              {studentFacingPrompt && <p data-part2-student-prompt className="absolute left-1/2 top-12 z-20 w-[980px] -translate-x-1/2 text-center text-[30px] font-semibold leading-tight text-stone-700">{studentFacingPrompt}</p>}
              {activeStep.wordElementMeanings?.length ? (
                <aside data-part2-word-element-meanings className="absolute left-1/2 top-12 z-20 max-w-[1020px] -translate-x-1/2 rounded-2xl border border-violet-200 bg-white/95 px-6 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Word element meanings</p>
                  <ul className="mt-1 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xl font-semibold text-stone-800">
                    {activeStep.wordElementMeanings.map(entry => <li key={`${activeStep.id}-${entry.objectId}`}>{entry.objectId} · {entry.meaning}</li>)}
                  </ul>
                </aside>
              ) : null}
              {buildStep && !readOnly && <div data-part2-staging-stack className="absolute left-12 top-14 z-20 h-[610px] w-[280px] rounded-2xl border border-stone-300 bg-stone-50/90 p-4 shadow-sm"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Pull stack</p><p className="mt-1 text-xs text-stone-500">Take the top supplied card first.</p></div>}
              {buildStep && readOnly && unplaced.length > 0 && <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center text-2xl font-semibold text-stone-400">Waiting for the teacher to place the supplied materials.</p>}
              {activeStep.actionType === 'NOTEBOOK' ? (
                <NotebookPage step={activeStep} />
              ) : buildStep ? orderedObjects.map(renderObject) : (
                usesWordSequence ? (
                  activeWord ? renderObject(activeWord, activeWordIndex, true) : null
                ) : (
                  <div data-part2-static-objects className="absolute inset-0 z-10">
                    {visibleStaticObjects.map(renderObject)}
                  </div>
                )
              )}
              {visibleMarks.map(mark => (
                <Draggable
                  key={mark.id}
                  initialPos={{ x: mark.x, y: mark.y }}
                  viewportScale={contentScale * lessonStageScale}
                  onDragEnd={position => !readOnly && updateMark(mark.id, position)}
                  className={readOnly ? 'pointer-events-none' : 'pointer-events-auto'}
                  style={{ zIndex: 90 }}
                >
                  <div data-part2-coding-mark className="relative group/part2-mark flex items-center justify-center p-4">
                    <CodingMarkContent mark={mark} variant="small" />
                    {!readOnly && <button
                      type="button"
                      onClick={event => { event.stopPropagation(); removeMark(mark.id); }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-white opacity-0 shadow-lg transition-opacity group-hover/part2-mark:opacity-100"
                      aria-label="Remove coding mark"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>}
                  </div>
                </Draggable>
              ))}
            </div>
          </div>
        </div>
        <canvas
          ref={syncedDrawing.canvasRef}
          data-part2-drawing-surface
          onPointerDown={syncedDrawing.onPointerDown}
          onPointerMove={syncedDrawing.onPointerMove}
          onPointerUp={syncedDrawing.onPointerUp}
          onPointerCancel={syncedDrawing.onPointerCancel}
          className={`absolute inset-0 z-40 touch-none ${readOnly || activeDrawingTool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
        />
      </div>

      {!readOnly && showTeacherPrivate && (
        <details data-part2-save-panel className="border-t border-stone-200 bg-white px-5 py-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-stone-600">Save Part 2 note</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-[auto_1fr_1fr_auto] md:items-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700"><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} /> Complete</label>
            <label className="text-xs font-semibold text-stone-700">Trouble spots<input value={troubleSpots} onChange={event => setTroubleSpots(event.target.value)} placeholder={activeStep.saveHints?.troubleSpotPrompt || 'Brief pattern or difficulty'} className="mt-1 block w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" /></label>
            <label className="text-xs font-semibold text-stone-700">Instructional note<input value={instructionalNote} onChange={event => setInstructionalNote(event.target.value)} placeholder={activeStep.saveHints?.notePrompt || 'Brief lesson note'} className="mt-1 block w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" /></label>
            <div className="flex flex-col gap-2"><label className="text-xs font-semibold text-stone-700"><input type="checkbox" checked={tagCurrentStep} onChange={event => setTagCurrentStep(event.target.checked)} /> Tag current step</label><button type="button" disabled={!onUpdateNotes} onClick={savePart2} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-35"><Save className="mr-1 inline h-3.5 w-3.5" /> Save</button></div>
          </div>
          {saved && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Saved to the existing lesson session note.</p>}
        </details>
      )}
    </section>
  );
};

export default Part2InteractiveRunner;
