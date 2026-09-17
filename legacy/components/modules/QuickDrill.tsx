import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseWordToTiles } from '../../utils';
import { isSubstepAtLeast } from '../../masterCurriculum';
import { WRS_PHONEME_MAP } from '../../wrsKnowledgeBase';
import Tile from '../Tile';
import {
  ChevronLeft, ChevronRight, Shuffle, Ear, Trash2,
  CloudSun, Plane, Flower, Bug, BookOpen, Layers,
  CheckCircle2, Pen, MousePointer2, PenTool, Sparkles
} from 'lucide-react';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';
import { useLessonRuntime } from '../lessonRuntimeContext';

interface QuickDrillProps {
  sounds: string[];
  isReverse?: boolean;
  step?: string;
  substep?: string;
  currentIndex?: number;
  onUpdateIndex?: (index: number) => void;
  revealedCount?: number;
  onUpdateRevealed?: (count: number) => void;
  isHandwritingMode?: boolean;
  onUpdateHandwriting?: (mode: boolean) => void;
  shuffledItems?: string[];
  onUpdateItems?: (items: string[]) => void;
  strokes?: DrawingStroke[];
  onUpdateStrokes?: (strokes: DrawingStroke[]) => void;
  readOnly?: boolean;
}

interface DrillCorrespondence {
  phoneme: string;
  graphemes: string[];
  keyword: string;
  introduced: string;
  category: string;
}

interface RevealedAnswer {
  text: string;
  isNew: boolean;
  kind?: 'grapheme' | 'word-element';
}

const WORD_ELEMENT_PREFIX = 'word-element::';

export interface AuditoryDrillItem {
  phoneme: string;
  responses: string[];
}

/**
 * Preserve source-authored auditory prompts and their exact response order.
 * A curriculum map is used only as a legacy fallback for prompts that have no
 * source-provided response.
 */
export const parseAuditoryDrillItem = (item: string): AuditoryDrillItem => {
  const source = item.trim();
  const match = source.match(/^\/([^/]+)\/\s*(?:→|->|=)\s*(.+)$/);
  if (match) {
    return {
      phoneme: match[1].trim(),
      responses: match[2].split(',').map(value => value.trim()).filter(Boolean)
    };
  }
  return {
    phoneme: source.replace(/^\//, '').replace(/\/$/, ''),
    responses: []
  };
};

const QuickDrill: React.FC<QuickDrillProps> = ({
  sounds,
  isReverse = false,
  step = "1",
  substep = "1",
  currentIndex: syncedIndex,
  onUpdateIndex,
  revealedCount: syncedRevealed,
  onUpdateRevealed,
  isHandwritingMode: syncedHandwriting,
  onUpdateHandwriting,
  shuffledItems: syncedItems,
  onUpdateItems,
  strokes,
  onUpdateStrokes,
  readOnly = false
}) => {
  const lesson = useLessonRuntime();
  const [localIndex, setLocalIndex] = useState(0);
  const [localRevealedCount, setLocalRevealedCount] = useState(0);
  const [localIsHandwritingMode, setLocalIsHandwritingMode] = useState(false);
  const [localShuffledItems, setLocalShuffledItems] = useState<string[]>([]);

  const currentIndex = syncedIndex !== undefined ? syncedIndex : localIndex;
  const revealedCount = syncedRevealed !== undefined ? syncedRevealed : localRevealedCount;
  const isHandwritingMode = syncedHandwriting !== undefined ? syncedHandwriting : localIsHandwritingMode;
  const shuffledItems = syncedItems !== undefined ? syncedItems : localShuffledItems;

  const setCurrentIndex = (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(currentIndex) : val;
    if (onUpdateIndex) onUpdateIndex(next);
    else setLocalIndex(next);
  };

  const setRevealedCount = (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(revealedCount) : val;
    if (onUpdateRevealed) onUpdateRevealed(next);
    else setLocalRevealedCount(next);
  };

  const setIsHandwritingMode = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(isHandwritingMode) : val;
    if (onUpdateHandwriting) onUpdateHandwriting(next);
    else setLocalIsHandwritingMode(next);
  };

  const setShuffledItems = (val: string[] | ((prev: string[]) => string[])) => {
    const next = typeof val === 'function' ? val(shuffledItems) : val;
    if (onUpdateItems) onUpdateItems(next);
    else setLocalShuffledItems(next);
  };

  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('pen-blue');
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const syncedDrawing = useSyncedDrawingCanvas({
    strokes,
    onUpdateStrokes,
    tool,
    lineWidth: 4,
    readOnly
  });

  const stepNum = parseInt(step, 10);
  const subNum = isNaN(parseInt(substep, 10)) ? 99 : parseInt(substep, 10);

  const compareIntroduced = (a: string, b: string) => {
    const parse = (s: string) => (s || "0.0").split('.').map(v => parseInt(v, 10) || 0);
    const [sA, subA] = parse(a);
    const [sB, subB] = parse(b);
    if (sA !== sB) return sA - sB;
    return subA - subB;
  };

  const allCorrespondences: DrillCorrespondence[] = useMemo(() => {
    const list: DrillCorrespondence[] = [];
    Object.entries(WRS_PHONEME_MAP).forEach(([category, entries]) => {
      entries.forEach((entry: any) => {
        list.push({
          phoneme: entry.phoneme,
          graphemes: entry.graphemes,
          keyword: entry.keyword || entry.phoneme,
          introduced: entry.introduced,
          category
        });
      });
    });
    return list.sort((a, b) => compareIntroduced(a.introduced, b.introduced));
  }, []);

  const learnedCorrespondences = useMemo(() => (
    allCorrespondences.filter(c => isSubstepAtLeast(stepNum, subNum, c.introduced))
  ), [allCorrespondences, stepNum, subNum]);

  const part6WordElements = useMemo(() => {
    if (!isReverse) return [];
    const part6 = lesson?.runtimePlan?.parts?.find(part => part.part === 6);
    return Array.isArray(part6?.data?.wordElements)
      ? part6.data.wordElements.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  }, [isReverse, lesson?.runtimePlan]);

  const soundsStr = Array.isArray(sounds) ? sounds.join(',') : '';
  const wordElementsStr = part6WordElements.join(',');

  const reverseSoundItems = useMemo(() => {
    if (!isReverse) return [];
    const lessonBase = Array.isArray(sounds)
      ? sounds.map(item => item.trim()).filter(Boolean)
      : [];
    return lessonBase.length > 0
      ? lessonBase
      : ['/ă/ → a', '/ĕ/ → e', '/ĭ/ → i', '/ŏ/ → o', '/ŭ/ → u'];
  }, [isReverse, soundsStr]);

  const reverseWordElementItems = useMemo(() => (
    part6WordElements.map(element => `${WORD_ELEMENT_PREFIX}${element}`)
  ), [wordElementsStr]);

  const drillItems = useMemo(() => {
    const lessonBase = Array.isArray(sounds) ? sounds : [];
    if (isReverse) return [...reverseSoundItems, ...reverseWordElementItems];
    const filtered = lessonBase.filter(s => !s.endsWith('-e'));
    return filtered.length > 0 ? filtered : ["a", "e", "i", "o", "u"];
  }, [isReverse, soundsStr, reverseSoundItems, reverseWordElementItems]);

  const drillItemsStr = drillItems.join(',');

  const sortedItems = useMemo(() => {
    if (isReverse) return [...drillItems];
    return [...drillItems].sort((a, b) => {
      const entryA = learnedCorrespondences.find(c => c.graphemes.includes(a) || c.phoneme === a);
      const entryB = learnedCorrespondences.find(c => c.graphemes.includes(b) || c.phoneme === b);
      if (!entryA || !entryB) return 0;
      return compareIntroduced(entryA.introduced, entryB.introduced);
    });
  }, [drillItemsStr, learnedCorrespondences, isReverse]);

  const shuffledItemsMatchDrill = useMemo(() => {
    if (!shuffledItems.length || shuffledItems.length !== drillItems.length) return false;
    const shuffledSorted = [...shuffledItems].sort();
    const drillSorted = [...drillItems].sort();
    const sameItems = shuffledSorted.every((item, index) => item === drillSorted[index]);
    if (!sameItems) return false;
    if (!isReverse) return true;

    // Part 6 has two distinct procedures. A persisted/shuffled sound set is
    // valid only when every sound remains before the Word Element section.
    const soundSlice = shuffledItems.slice(0, reverseSoundItems.length);
    const wordElementSlice = shuffledItems.slice(reverseSoundItems.length);
    return soundSlice.every(item => !item.startsWith(WORD_ELEMENT_PREFIX))
      && wordElementSlice.every(item => item.startsWith(WORD_ELEMENT_PREFIX));
  }, [shuffledItems, drillItemsStr, isReverse, reverseSoundItems.length]);

  const activeItems = shuffledItemsMatchDrill ? shuffledItems : sortedItems;
  const safeCurrentIndex = activeItems.length ? Math.min(currentIndex, activeItems.length - 1) : 0;
  const currentItem = activeItems[safeCurrentIndex];
  const isWordElementItem = Boolean(currentItem?.startsWith(WORD_ELEMENT_PREFIX));
  const currentWordElement = isWordElementItem ? currentItem.slice(WORD_ELEMENT_PREFIX.length) : '';
  const currentAuditoryItem = isWordElementItem ? null : parseAuditoryDrillItem(currentItem || '');
  const teacherPrompt = isWordElementItem ? currentWordElement : '/' + (currentAuditoryItem?.phoneme || '') + '/';
  const part6Section = isReverse ? (isWordElementItem ? 'Word Elements' : 'Sounds') : null;
  const sectionItems = isWordElementItem
    ? activeItems.filter(item => item.startsWith(WORD_ELEMENT_PREFIX))
    : activeItems.filter(item => !item.startsWith(WORD_ELEMENT_PREFIX));
  const currentSectionIndex = Math.max(0, sectionItems.indexOf(currentItem)) + 1;

  useEffect(() => {
    if (activeItems.length > 0 && currentIndex !== safeCurrentIndex) setCurrentIndex(safeCurrentIndex);
  }, [activeItems.length, currentIndex, safeCurrentIndex]);

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const drawLine = (y: number, color: string, dashed = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [10, 10] : []);
      ctx.moveTo(0, h * y);
      ctx.lineTo(w, h * y);
      ctx.stroke();
    };
    drawLine(0.2, '#3b82f6');
    drawLine(0.45, '#94a3b8', true);
    drawLine(0.7, '#22c55e');
    drawLine(0.9, '#92400e', true);
  };

  const setupCanvases = () => {
    if (!containerRef.current || !gridRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    const canvas = gridRef.current;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawGrid(ctx, width, height);
  };

  useEffect(() => {
    if (!isHandwritingMode) return;
    window.addEventListener('resize', setupCanvases);
    setTimeout(setupCanvases, 100);
    return () => window.removeEventListener('resize', setupCanvases);
  }, [isHandwritingMode]);

  const clearDrawing = () => syncedDrawing.clear();

  const revealedData: RevealedAnswer[] = useMemo(() => {
    if (!currentItem) return [];
    if (isWordElementItem) return [{ text: currentWordElement, isNew: false, kind: 'word-element' }];
    if (isReverse) {
      const sourceResponses = parseAuditoryDrillItem(currentItem).responses;
      const fallbackResponses = learnedCorrespondences
        .filter(c => c.phoneme === parseAuditoryDrillItem(currentItem).phoneme)
        .sort((a, b) => compareIntroduced(a.introduced, b.introduced))
        .flatMap(match => match.graphemes);
      return (sourceResponses.length > 0 ? sourceResponses : Array.from(new Set(fallbackResponses))).map(text => ({
        text,
        isNew: false,
        kind: 'grapheme' as const
      }));
    }
    const isExplicitVowel = currentItem.startsWith('[') && currentItem.endsWith(']');
    const cleanGrapheme = currentItem.replace(/[\[\]]/g, '').toLowerCase();
    const matches = learnedCorrespondences.filter(c => {
      const hasGrapheme = c.graphemes.some(g => {
        const cleanG = g.toLowerCase();
        if (cleanG === cleanGrapheme) return true;
        if (['a', 'e', 'i', 'o', 'u'].includes(cleanGrapheme) && cleanG === `${cleanGrapheme}-e`) return true;
        return false;
      });
      if (!hasGrapheme) return false;
      if (cleanGrapheme === 'y') {
        const isVowelCategory = c.category.includes('Vowel') || c.category.includes('Diphthong');
        return isExplicitVowel ? isVowelCategory : !isVowelCategory;
      }
      return true;
    });
    return matches.sort((a, b) => compareIntroduced(a.introduced, b.introduced)).map(c => ({
      text: `${c.keyword} /${c.phoneme}/`,
      isNew: c.introduced === `${step}.${substep}`,
      kind: 'grapheme' as const
    }));
  }, [currentItem, isReverse, learnedCorrespondences, step, substep, isWordElementItem, currentWordElement]);

  const nextCard = () => {
    setRevealedCount(0);
    if (safeCurrentIndex < activeItems.length - 1) setCurrentIndex(safeCurrentIndex + 1);
    else setCurrentIndex(0);
    if (isHandwritingMode) clearDrawing();
  };

  const prevCard = () => {
    setRevealedCount(0);
    if (safeCurrentIndex > 0) setCurrentIndex(safeCurrentIndex - 1);
    else setCurrentIndex(Math.max(0, activeItems.length - 1));
    if (isHandwritingMode) clearDrawing();
  };

  const handleReveal = () => {
    if (revealedCount < revealedData.length) setRevealedCount(prev => prev + 1);
    else nextCard();
  };

  const shuffleDrill = () => {
    const randomize = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
    const nextItems = isReverse
      ? [...randomize(reverseSoundItems), ...reverseWordElementItems]
      : randomize(drillItems);
    setShuffledItems(nextItems);
    setCurrentIndex(0);
    setRevealedCount(0);
  };

  const renderWordElementCard = (text: string) => {
    const suffix = text.startsWith('-') && !text.endsWith('-');
    return (
      <div className={`min-w-[180px] rounded-2xl border-4 px-8 py-6 text-center text-5xl font-black shadow-xl ${suffix ? 'border-amber-500 bg-amber-200 text-stone-900' : 'border-stone-500 bg-stone-300 text-stone-900'}`}>
        {text}
      </div>
    );
  };

  const renderReverseAnswer = () => (
    <div className="flex max-w-5xl flex-wrap items-center justify-center gap-5">
      {revealedData.slice(0, revealedCount).map((answer, answerIndex) => (
        answer.kind === 'word-element'
          ? <React.Fragment key={`${answer.text}-${answerIndex}`}>{renderWordElementCard(answer.text)}</React.Fragment>
          : <div key={`${answer.text}-${answerIndex}`} className="flex items-center justify-center">{parseWordToTiles(answer.text).map((tile, tileIndex) => <Tile key={`${answerIndex}-${tileIndex}`} data={tile} size="2xl" />)}</div>
      ))}
    </div>
  );

  const renderPart6StudentSurface = () => (
    <section
      data-testid="part6-primary-surface"
      data-part6-student-state={revealedCount > 0 ? 'revealed' : 'listen'}
      className="flex h-full w-full flex-col items-center justify-center"
    >
      {revealedCount > 0 ? renderReverseAnswer() : (
        <div className="bg-white p-12 rounded-[2rem] border border-stone-100 flex flex-col items-center shadow-sm">
          <div className="mb-4 p-4 bg-red-50 rounded-full text-red-800"><Ear className="w-12 h-12" /></div>
          <span className="text-5xl font-black font-serif text-stone-300">LISTEN</span>
        </div>
      )}
    </section>
  );
  const renderVisualAnswerLog = () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {revealedData.slice(0, revealedCount).map((answer, index) => (
        <div key={`${answer.text}-${index}`} className={`px-6 py-3 rounded-2xl border-b-2 shadow-sm animate-in slide-in-from-bottom-2 flex items-center gap-3 ${answer.isNew ? 'bg-amber-50 border-amber-100 ring-1 ring-amber-400/20' : 'bg-white border-stone-100'}`}>
          <span className={`text-lg font-black font-serif italic ${answer.isNew ? 'text-amber-900' : 'text-stone-500'}`}>{answer.text}</span>
          {answer.isNew ? <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[8px] font-black uppercase tracking-tighter"><Sparkles className="w-2 h-2" /> New</div> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-full flex flex-col bg-[#fcfbf9] font-sans overflow-hidden text-stone-900">
      <div className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-stone-100 shadow-sm z-30 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#b91c1c] rounded-lg shadow-sm">{isReverse ? <Ear className="w-4 h-4 text-white" /> : <Layers className="w-4 h-4 text-white" />}</div>
            <div>
              <h2 className="text-lg font-bold tracking-widest uppercase font-serif text-stone-900">{isReverse ? "Auditory Drill" : "Visual Drill"}</h2>
              {part6Section ? <p data-part6-section={isWordElementItem ? 'word-elements' : 'sounds'} className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-400">{part6Section}</p> : null}
            </div>
          </div>
          {!readOnly && <button onClick={() => setIsHandwritingMode(!isHandwritingMode)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest ${isHandwritingMode ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-400 hover:text-stone-900'}`}><Pen className={`w-3.5 h-3.5 ${isHandwritingMode ? 'animate-pulse' : ''}`} /> Handwriting</button>}
        </div>
        <div className="flex items-center gap-3">
          {isHandwritingMode && !readOnly && <div className="flex bg-stone-50 p-1 rounded-xl gap-1 border border-stone-100 mr-2">
            <button onClick={() => setTool('cursor')} className={`p-2 rounded-lg ${tool === 'cursor' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400'}`}><MousePointer2 className="w-4 h-4" /></button>
            <button onClick={() => setTool('pen-blue')} className={`p-2 rounded-lg ${tool === 'pen-blue' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-400'}`}><PenTool className="w-4 h-4" /></button>
            <button onClick={() => setTool('pen-red')} className={`p-2 rounded-lg ${tool === 'pen-red' ? 'bg-red-600 text-white shadow-md' : 'text-stone-400'}`}><PenTool className="w-4 h-4" /></button>
            <button onClick={clearDrawing} className="p-2 rounded-lg text-stone-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>}
          {!readOnly && <button onClick={shuffleDrill} className="flex items-center gap-2 px-4 py-2 bg-white text-stone-400 rounded-xl font-bold text-[10px] uppercase border border-stone-100 shadow-sm"><Shuffle className="w-3.5 h-3.5" />Shuffle</button>}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center">
        {activeItems.length === 0 ? <div className="w-full h-full flex items-center justify-center text-stone-400 italic font-serif text-xl">No items loaded.</div> : (
          <div className="relative w-full h-full flex flex-col p-6 gap-6 items-center">
            {isReverse && !readOnly && <div data-testid="teacher-dictation-cue" className="w-full max-w-4xl flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-sm">
              <div className="rounded-full bg-amber-900 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">Teacher only</div>
              <div className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">{isWordElementItem ? 'Dictate Word Element' : 'Dictate Sound'}</span>
                <span className="text-2xl font-black font-serif text-stone-900">{teacherPrompt}</span>
                {isWordElementItem ? (
                  <p data-part6-word-element-procedure className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-amber-900">
                    After the student repeats it, have the student select the matching word-element manipulative and finger-write it while orally spelling it, including the required dash or dashes.
                  </p>
                ) : null}
              </div>
            </div>}

            <div onClick={!readOnly && !isHandwritingMode ? handleReveal : undefined} className={`flex-[3] w-full max-w-5xl flex flex-col items-center justify-center relative ${!readOnly && !isHandwritingMode ? 'cursor-pointer group' : ''}`}>
              {isReverse && !isHandwritingMode ? renderPart6StudentSurface() : !isHandwritingMode ? <>
                {!readOnly && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-5 transition-opacity"><Sparkles className="w-64 h-64 text-red-900" /></div>}
                <div className="flex flex-col items-center justify-center w-full">
                  <div className="flex items-center justify-center">{parseWordToTiles(currentItem).map((t, i) => <Tile key={i} data={t} size="xl" />)}</div>
                </div>
              </> : <div ref={containerRef} className="w-full h-full bg-white rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="absolute left-6 top-0 bottom-0 z-10 flex flex-col justify-around pointer-events-none opacity-20"><CloudSun className="w-8 h-8 text-blue-500" /><Plane className="w-8 h-8 text-stone-400" /><Flower className="w-8 h-8 text-green-500" /><Bug className="w-8 h-8 text-stone-600" /></div>
                <canvas ref={gridRef} className="absolute inset-0 pointer-events-none" />
                <canvas ref={syncedDrawing.canvasRef} onPointerDown={syncedDrawing.onPointerDown} onPointerMove={syncedDrawing.onPointerMove} onPointerUp={syncedDrawing.onPointerUp} onPointerCancel={syncedDrawing.onPointerCancel} className={`absolute inset-0 z-20 touch-none ${readOnly || tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`} />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 px-6 py-2 rounded-full border border-stone-100 z-30"><span className="text-stone-900 font-black text-2xl font-serif">{isReverse && revealedCount === 0 ? 'LISTEN' : teacherPrompt}</span></div>
              </div>}
            </div>

            {!readOnly && <div className="w-full max-w-4xl flex-[1] flex flex-col">
              <div className="flex items-center justify-between mb-2 px-2"><div className="flex items-center gap-2"><div className={`h-2.5 w-2.5 rounded-full ${revealedCount > 0 ? 'bg-emerald-500' : 'bg-stone-300'}`}></div><span className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400">Answer Check</span></div><span data-part6-section-progress className="text-[8px] font-black text-stone-300 uppercase tracking-widest">{part6Section ? `${part6Section} ${currentSectionIndex} / ${sectionItems.length}` : `${safeCurrentIndex + 1} / ${activeItems.length}`}</span></div>
              <div className="flex-1 bg-white rounded-2xl border border-stone-100 p-4 flex flex-col shadow-sm overflow-hidden"><div className="w-full h-full overflow-y-auto flex flex-wrap gap-3 items-center justify-center">
                {revealedCount === 0 ? <div className="flex flex-col items-center justify-center h-full gap-2 opacity-5"><BookOpen className="w-8 h-8 text-stone-900" /><p className="text-[8px] font-black uppercase tracking-[0.4em] text-stone-900">Answer hidden</p></div> : (isReverse ? renderReverseAnswer() : renderVisualAnswerLog())}
              </div></div>
            </div>}
          </div>
        )}
      </div>

      {!readOnly && <button onClick={prevCard} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white text-stone-300 shadow-md hidden md:flex z-50 border border-stone-100"><ChevronLeft className="w-8 h-8" /></button>}
      {!readOnly && <button onClick={nextCard} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white text-stone-300 shadow-md hidden md:flex z-50 border border-stone-100"><ChevronRight className="w-8 h-8" /></button>}
    </div>
  );
};

export default QuickDrill;
