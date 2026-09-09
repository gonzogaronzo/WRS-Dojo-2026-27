import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, MousePointer2, PenTool, PlusCircle, RotateCcw, Save, Trash2, X } from 'lucide-react';
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
  type Part2InteractivePresentation,
  type Part2InteractiveStep
} from '../../part2Presentation';
import {
  createPart2SavePayload,
  insertPart2QuickPractice,
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
  quickPracticeAnchorId?: string;
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
    quickPracticeAnchorId: typeof record.quickPracticeAnchorId === 'string'
      ? record.quickPracticeAnchorId
      : undefined,
    activeWordIndex: typeof record.activeWordIndex === 'number' && Number.isInteger(record.activeWordIndex)
      ? Math.max(0, record.activeWordIndex)
      : undefined
  };
};

const isQuickPractice = (state: RunnerMetaState | undefined, step: Part2InteractiveStep) => (
  step.kind === 'step' && state?.quickPracticeAnchorId === step.id
);

const semanticTile = (object: Part2InstructionObject) => ({
  text: encodePart2SemanticUnit(object.role, object.text),
  type: 'syllable' as const
});

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
  const quickPractice = activeStep ? isQuickPractice(meta, activeStep) : false;
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

  const clearCurrentWorkspace = (preserveQuickPractice = false) => {
    if (!activeStep || activeStep.kind === 'invalid') return;
    const nextActive = { ...activeStates };
    for (const key of Object.keys(nextActive)) {
      if (key.startsWith(`part2:${activeStep.id}:`)) delete nextActive[key];
    }
    if (!preserveQuickPractice) delete nextActive[RUNNER_META_KEY];
    replaceStates({ ...stateMap, [resolvedIndex]: nextActive });
  };

  const clearCurrentQuickPractice = () => {
    if (!activeStates[RUNNER_META_KEY]) return;
    const nextActive = { ...activeStates };
    delete nextActive[RUNNER_META_KEY];
    replaceStates({ ...stateMap, [resolvedIndex]: nextActive });
  };

  const setIndex = (next: number) => {
    const safe = clampIndex(next, stepCount);
    if (onUpdateActiveStepIndex) onUpdateActiveStepIndex(safe);
    else setLocalIndex(safe);
  };

  const navigate = (direction: 'back' | 'next' | 'skip') => {
    // Navigation preserves each move's placed/rearranged materials. Repeat is
    // the explicit reset action; leaving Quick Practice only removes its
    // transient view-state marker.
    clearCurrentQuickPractice();
    const next = direction === 'back'
      ? previousPart2Step({ activeIndex: resolvedIndex }, stepCount)
      : nextPart2Step({ activeIndex: resolvedIndex }, stepCount);
    setIndex(next.activeIndex);
  };

  const insertQuickPractice = () => {
    if (!activeStep || activeStep.kind === 'invalid') return;
    const next = insertPart2QuickPractice({ activeIndex: resolvedIndex }, presentation.steps);
    const nextActive = { ...activeStates };
    for (const key of Object.keys(nextActive)) {
      if (key.startsWith(`part2:${activeStep.id}:`)) delete nextActive[key];
    }
    nextActive[RUNNER_META_KEY] = {
      ...readRunnerMetaState(activeStates[RUNNER_META_KEY]),
      quickPracticeAnchorId: next.quickPracticeAnchorId,
      activeWordIndex: 0,
      x: 0,
      y: 0,
      scale: 1
    };
    replaceStates({ ...stateMap, [resolvedIndex]: nextActive });
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
  const usesWordSequence = activeStep.displayType === 'WRITTEN_WORD'
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
  const displayCue = quickPractice ? 'Quick Practice — repeat the supplied move.' : activeStep.teacherCue;

  const setActiveWordIndex = (next: number) => {
    if (!usesWordSequence) return;
    updateCurrentState(RUNNER_META_KEY, { activeWordIndex: clampIndex(next, orderedObjects.length) });
  };

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

  const renderObject = (object: Part2InstructionObject, objectIndex: number) => {
    const key = objectKey(activeStep.id, object.id);
    const defaultStack = {
      x: 105,
      y: 118 + Math.max(0, (object.stagingOrder || objectIndex + 1) - 1) * 18,
      scale: 1,
      placed: false
    };
    const defaultWork = { x: 410 + objectIndex * 205, y: 410, scale: 1, placed: true };
    const fallback = buildStep ? defaultStack : defaultWork;
    const state = readObjectState(activeStates[key], fallback);
    const placed = !buildStep || state.placed;
    const isTopStaged = buildStep && !placed && object.id === topStagedId;

    if (readOnly && !placed) return null;
    return (
      <Draggable
        key={key}
        initialPos={{ x: state.x, y: state.y }}
        viewportScale={contentScale * lessonStageScale}
        disabled={readOnly || (buildStep && !placed && !isTopStaged)}
        onDrag={position => updateCurrentState(key, { ...position, placed: true })}
        onDragEnd={position => updateCurrentState(key, { ...position, placed: true })}
        className={readOnly ? 'pointer-events-none' : ''}
        style={{ zIndex: placed ? 30 + objectIndex : 200 - (object.stagingOrder || objectIndex) }}
      >
        <div
          data-part2-manipulative
          data-part2-object-id={object.id}
          data-part2-role={object.role}
          {...(!placed ? { 'data-staging-order': object.stagingOrder || objectIndex + 1 } : {})}
          className={`rounded-xl ${!placed ? 'bg-white/85 p-1 shadow-lg' : 'bg-transparent p-0'}`}
        >
          <Tile data={semanticTile(object)} size="xl" />
        </div>
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
              <button type="button" className={buttonClass} onClick={() => navigate('back')} disabled={resolvedIndex === 0} aria-label="Back one instructional move"><ChevronLeft className="inline h-3.5 w-3.5" /> Back</button>
              <button type="button" className={buttonClass} onClick={() => navigate('next')} disabled={resolvedIndex >= stepCount - 1} aria-label="Next instructional move">Next <ChevronRight className="inline h-3.5 w-3.5" /></button>
              <button type="button" className={buttonClass} onClick={() => clearCurrentWorkspace(quickPractice)} aria-label="Repeat current instructional move"><RotateCcw className="inline h-3.5 w-3.5" /> Repeat</button>
              <button type="button" className={buttonClass} onClick={() => navigate('skip')} disabled={resolvedIndex >= stepCount - 1} aria-label="Skip current instructional move">Skip</button>
              <button type="button" className={buttonClass} onClick={insertQuickPractice} aria-label="Insert transient Quick Practice"><PlusCircle className="inline h-3.5 w-3.5" /> Quick Practice</button>
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
                <aside data-part2-notebook-note className="max-w-2xl rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                  <p className="font-black uppercase tracking-[0.1em] text-sky-800">Student Notebook</p>
                  <dl className="mt-1 grid gap-x-3 gap-y-1 sm:grid-cols-[5.5rem_1fr]">
                    <dt className="font-bold">Location</dt>
                    <dd>{activeStep.notebookContext?.location || 'Location is unavailable from this source payload; do not infer a page or layout.'}</dd>
                    <dt className="font-bold">Entry</dt>
                    <dd>{activeStep.notebookContext?.entryAppearance || 'Unavailable from this source payload; do not invent the entry form.'}</dd>
                    <dt className="font-bold">Why now</dt>
                    <dd>{activeStep.notebookContext?.purpose || 'Unavailable from this source payload; confirm the instructional purpose in the cited source.'}</dd>
                  </dl>
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
              {activeStep.studentPrompt && <p data-part2-student-prompt className="absolute left-1/2 top-12 z-20 w-[980px] -translate-x-1/2 text-center text-[30px] font-semibold leading-tight text-stone-700">{activeStep.studentPrompt}</p>}
              {buildStep && !readOnly && <div data-part2-staging-stack className="absolute left-12 top-14 z-20 h-[610px] w-[280px] rounded-2xl border border-stone-300 bg-stone-50/90 p-4 shadow-sm"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Pull stack</p><p className="mt-1 text-xs text-stone-500">Take the top supplied card first.</p></div>}
              {buildStep && readOnly && unplaced.length > 0 && <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center text-2xl font-semibold text-stone-400">Waiting for the teacher to place the supplied materials.</p>}
              {buildStep ? orderedObjects.map(renderObject) : (
                <div data-part2-static-objects className="absolute inset-0 z-10 flex flex-wrap content-center items-center justify-center gap-5 px-32 pt-20">
                  {visibleStaticObjects.map(object => (
                    <div
                      key={object.id}
                      data-part2-object-id={object.id}
                      data-part2-role={object.role}
                      {...(usesWordSequence ? { 'data-part2-active-word': 'true', 'data-part2-word-index': activeWordIndex + 1 } : {})}
                      className={usesWordSequence ? 'origin-center scale-[1.35]' : undefined}
                    >
                      <Tile data={semanticTile(object)} size="xl" />
                    </div>
                  ))}
                </div>
              )}
              {usesWordSequence && !readOnly && orderedObjects.length > 1 && (
                <div data-part2-word-sequence-controls className="absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-stone-300 bg-white/95 px-4 py-3 shadow-sm">
                  <button type="button" className={compactButtonClass} onClick={() => setActiveWordIndex(activeWordIndex - 1)} disabled={activeWordIndex === 0} aria-label="Previous word"><ChevronLeft className="inline h-3.5 w-3.5" /> Word</button>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">Word {activeWordIndex + 1} of {orderedObjects.length}</span>
                  <button type="button" className={compactButtonClass} onClick={() => setActiveWordIndex(activeWordIndex + 1)} disabled={activeWordIndex >= orderedObjects.length - 1} aria-label="Next word">Word <ChevronRight className="inline h-3.5 w-3.5" /></button>
                </div>
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
