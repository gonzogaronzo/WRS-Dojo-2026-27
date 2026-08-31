import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseWordToTiles, TileData } from '../../utils';
import { getTilesForStep, isSubstepAtLeast } from '../../masterCurriculum';
import { WRS_PHONEME_MAP } from '../../wrsKnowledgeBase';
import Tile from '../Tile';
import {
  ChevronLeft, ChevronRight, Shuffle, RotateCcw, Ear, Trash2,
  CloudSun, Plane, Flower, Bug, BookOpen, Layers, Volume2,
  CheckCircle2, Pen, MousePointer2, PenTool, Sparkles
} from 'lucide-react';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';

interface QuickDrillProps {
  sounds: string[];
  isReverse?: boolean;
  step?: string;
  substep?: string;
  // Sync props
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
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
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

  const learnedCorrespondences = useMemo(() => {
    return allCorrespondences.filter(c => isSubstepAtLeast(stepNum, subNum, c.introduced));
  }, [allCorrespondences, stepNum, subNum]);

  const soundsStr = Array.isArray(sounds) ? sounds.join(',') : '';

  const drillItems = useMemo(() => {
    const lessonBase = Array.isArray(sounds) ? sounds : [];
    if (isReverse) {
      const activePhonemes = Array.from(new Set(
        learnedCorrespondences
          .filter(c => c.graphemes.some(g => lessonBase.some(lb => lb.replace(/[\[\]]/g, '') === g)))
          .map(c => c.phoneme)
      ));
      return activePhonemes.length > 0 ? activePhonemes : ["ă", "ĕ", "ĭ", "ŏ", "ŭ"];
    } else {
      const filtered = lessonBase.filter(s => !s.endsWith('-e'));
      return filtered.length > 0 ? filtered : ["a", "e", "i", "o", "u"];
    }
  }, [isReverse, soundsStr, learnedCorrespondences]);

  const drillItemsStr = drillItems.join(',');

  const sortedItems = useMemo(() => {
    return [...drillItems].sort((a, b) => {
      const entryA = learnedCorrespondences.find(c => c.graphemes.includes(a) || c.phoneme === a);
      const entryB = learnedCorrespondences.find(c => c.graphemes.includes(b) || c.phoneme === b);
      if (!entryA || !entryB) return 0;
      return compareIntroduced(entryA.introduced, entryB.introduced);
    });
  }, [drillItemsStr, learnedCorrespondences]);

  const activeItems = shuffledItems.length > 0 ? shuffledItems : sortedItems;

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const drawLine = (y: number, color: string, dashed = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (dashed) ctx.setLineDash([10, 10]);
      else ctx.setLineDash([]);
      ctx.moveTo(0, h * y);
      ctx.lineTo(w, h * y);
      ctx.stroke();
    };

    drawLine(0.2, '#3b82f6'); // Sky line
    drawLine(0.45, '#94a3b8', true); // Plane line
    drawLine(0.7, '#22c55e'); // Grass line
    drawLine(0.9, '#92400e', true); // Worm line
  };

  const setupCanvases = () => {
    if (containerRef.current && gridRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;

      [gridRef.current].forEach(canvas => {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      });

      rectRef.current = containerRef.current.getBoundingClientRect();
      const gridCtx = gridRef.current.getContext('2d');
      if (gridCtx) drawGrid(gridCtx, width, height);
    }
  };

  useEffect(() => {
    if (isHandwritingMode) {
      window.addEventListener('resize', setupCanvases);
      setTimeout(setupCanvases, 100);
      return () => window.removeEventListener('resize', setupCanvases);
    }
  }, [isHandwritingMode]);

  const clearDrawing = () => {
    syncedDrawing.clear();
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (tool === 'cursor') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    (e.target as Element).setPointerCapture(e.pointerId);

    rectRef.current = canvas.getBoundingClientRect();
    const x = e.clientX - rectRef.current.left;
    const y = e.clientY - rectRef.current.top;

    lastPointRef.current = { x, y };
    setIsDrawing(true);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = tool === 'pen-blue' ? '#1e40af' : '#991b1b';
    ctx.stroke();
  };

  const drawInk = (e: React.PointerEvent) => {
    if (!isDrawing || tool === 'cursor' || !lastPointRef.current || !rectRef.current) return;

    const x = e.clientX - rectRef.current.left;
    const y = e.clientY - rectRef.current.top;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPointRef.current = { x, y };
    }
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (isDrawing) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setIsDrawing(false);
      lastPointRef.current = null;
    }
  };

  const currentItem = activeItems[currentIndex];

  const revealedData = useMemo(() => {
    if (!currentItem) return [];
    if (isReverse) {
      const matches = learnedCorrespondences.filter(c => c.phoneme === currentItem);
      return Array.from(new Set(matches.sort((a, b) => compareIntroduced(a.introduced, b.introduced)).flatMap(m => m.graphemes))).map(g => ({
        text: g,
        isNew: false // Reverse drill doesn't usually highlight "new" graphemes the same way
      }));
    } else {
      const isExplicitVowel = currentItem.startsWith('[') && currentItem.endsWith(']');
      const cleanGrapheme = currentItem.replace(/[\[\]]/g, '').toLowerCase();
      const matches = learnedCorrespondences.filter(c => {
        const hasGrapheme = c.graphemes.some(g => {
          const cleanG = g.toLowerCase();
          if (cleanG === cleanGrapheme) return true;
          // Support V-E embedding in single vowel cards
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
        isNew: c.introduced === `${step}.${substep}`
      }));
    }
  }, [currentItem, isReverse, learnedCorrespondences, step, substep]);

  const nextCard = () => {
    setRevealedCount(0);
    if (currentIndex < activeItems.length - 1) setCurrentIndex(prev => prev + 1);
    else setCurrentIndex(0);
    if (isHandwritingMode) clearDrawing();
  };

  const prevCard = () => {
    setRevealedCount(0);
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    else setCurrentIndex(activeItems.length - 1);
    if (isHandwritingMode) clearDrawing();
  };

  const handleReveal = () => {
    if (revealedCount < revealedData.length) {
      setRevealedCount(prev => prev + 1);
    } else {
      nextCard();
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#fcfbf9] font-sans overflow-hidden text-stone-900">
      <div className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-stone-100 shadow-sm z-30 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-[#b91c1c] rounded-lg shadow-sm">
               {isReverse ? <Ear className="w-4 h-4 text-white" /> : <Layers className="w-4 h-4 text-white" />}
             </div>
             <h2 className="text-lg font-bold tracking-widest uppercase font-serif text-stone-900">
               {isReverse ? "Auditory Drill" : "Visual Drill"}
             </h2>
          </div>

          {!readOnly && <button
            onClick={() => setIsHandwritingMode(!isHandwritingMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest ${isHandwritingMode ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-400 hover:text-stone-900'}`}
          >
            <Pen className={`w-3.5 h-3.5 ${isHandwritingMode ? 'animate-pulse' : ''}`} />
            Handwriting
          </button>}
        </div>

        <div className="flex items-center gap-3">
          {isHandwritingMode && !readOnly && (
            <div className="flex bg-stone-50 p-1 rounded-xl gap-1 border border-stone-100 mr-2">
              <button onClick={() => setTool('cursor')} className={`p-2 rounded-lg ${tool === 'cursor' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><MousePointer2 className="w-4 h-4" /></button>
              <button onClick={() => setTool('pen-blue')} className={`p-2 rounded-lg ${tool === 'pen-blue' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><PenTool className="w-4 h-4" /></button>
              <button onClick={() => setTool('pen-red')} className={`p-2 rounded-lg ${tool === 'pen-red' ? 'bg-red-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><PenTool className="w-4 h-4" /></button>
              <div className="w-px h-6 bg-stone-200 mx-1 self-center" />
              <button onClick={clearDrawing} className="p-2 rounded-lg text-stone-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
          <button
            onClick={() => { setShuffledItems([...drillItems].sort(() => Math.random() - 0.5)); setCurrentIndex(0); setRevealedCount(0); }}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-stone-50 text-stone-400 rounded-xl transition-all font-bold text-[10px] uppercase border border-stone-100 active:scale-95 shadow-sm"
          ><Shuffle className="w-3.5 h-3.5" />Shuffle</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center">
        {activeItems.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-stone-400 italic font-serif text-xl">No items loaded.</div>
        ) : (
          <div className="relative w-full h-full flex flex-col p-6 gap-6 items-center">

            <div
              onClick={!isHandwritingMode ? handleReveal : undefined}
              className={`flex-[3] w-full max-w-5xl flex flex-col items-center justify-center relative ${!isHandwritingMode ? 'cursor-pointer group' : ''}`}
            >
              {!isHandwritingMode ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-5 transition-opacity">
                    <Sparkles className="w-64 h-64 text-red-900" />
                  </div>

                  <div className="flex flex-col items-center justify-center transform group-active:scale-95 transition-all duration-200 w-full">
                    {isReverse ? (
                      <div className="bg-white p-8 md:p-12 rounded-[2rem] border border-stone-100 flex flex-col items-center animate-in zoom-in duration-500 max-w-full shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
                         <div className="mb-4 p-4 bg-red-50 rounded-full text-red-800"><Volume2 className="w-8 h-8 md:w-12 md:h-12" /></div>
                         <span className="text-[144px] font-black font-serif text-stone-900 leading-none tracking-tighter">/{currentItem}/</span>
                      </div>
                    ) : (
                      <div className="animate-in zoom-in duration-500 flex items-center justify-center">
                         {parseWordToTiles(currentItem).map((t, i) => <Tile key={i} data={t} size="xl" />)}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div ref={containerRef} className="w-full h-full bg-white rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
                   <div className="absolute left-6 top-0 bottom-0 z-10 flex flex-col justify-around pointer-events-none opacity-20">
                      <div className="flex items-center gap-2" style={{ marginTop: '15%' }}><CloudSun className="w-8 h-8 text-blue-500" /></div>
                      <div className="flex items-center gap-2" style={{ marginTop: '20%' }}><Plane className="w-8 h-8 text-stone-400" /></div>
                      <div className="flex items-center gap-2" style={{ marginTop: '20%' }}><Flower className="w-8 h-8 text-green-500" /></div>
                      <div className="flex items-center gap-2" style={{ marginTop: '15%' }}><Bug className="w-8 h-8 text-stone-600" /></div>
                   </div>

                   <canvas ref={gridRef} className="absolute inset-0 pointer-events-none" />
                   <canvas
                     ref={syncedDrawing.canvasRef}
                     onPointerDown={syncedDrawing.onPointerDown}
                     onPointerMove={syncedDrawing.onPointerMove}
                     onPointerUp={syncedDrawing.onPointerUp}
                     onPointerCancel={syncedDrawing.onPointerCancel}
                     className={`absolute inset-0 z-20 touch-none ${readOnly || tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
                   />

                   <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border border-stone-100 z-30 pointer-events-none">
                      <span className="text-stone-900 font-black text-2xl font-serif">/{currentItem}/</span>
                   </div>
                </div>
              )}
            </div>

            <div className="w-full max-w-4xl flex-[1] flex flex-col">
               <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full transition-colors duration-500 ${revealedCount > 0 ? 'bg-emerald-500' : 'bg-stone-300'}`}></div>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400">Mastery Log</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest">{currentIndex + 1} / {activeItems.length}</span>
                    {isHandwritingMode && (
                      <button onClick={handleReveal} className="bg-red-900 text-white px-4 py-1.5 rounded-full font-black uppercase text-[8px] tracking-widest hover:bg-red-800 transition-all active:scale-95">Verify</button>
                    )}
                  </div>
               </div>

               <div className="flex-1 bg-white rounded-2xl border border-stone-100 p-4 flex flex-col shadow-sm relative overflow-hidden">
                  <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-wrap gap-3 relative z-10 items-center justify-center">
                    {revealedCount === 0 ? (
                       <div className="flex flex-col items-center justify-center h-full gap-2 opacity-5">
                          <BookOpen className="w-8 h-8 text-stone-900" />
                          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-stone-900">Analysis Pending</p>
                       </div>
                    ) : (
                      revealedData.slice(0, revealedCount).map((d: any, i) => (
                        <div key={i} className={`px-6 py-3 rounded-2xl border-b-2 shadow-sm animate-in slide-in-from-bottom-2 flex items-center gap-3 transition-all ${d.isNew ? 'bg-amber-50 border-amber-100 ring-1 ring-amber-400/20' : 'bg-white border-stone-100'}`}>
                           <span className={`text-lg font-black font-serif italic ${d.isNew ? 'text-amber-900' : 'text-stone-500'}`}>{d.text}</span>
                           {d.isNew ? (
                             <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[8px] font-black uppercase tracking-tighter">
                               <Sparkles className="w-2 h-2" /> New
                             </div>
                           ) : (
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                           )}
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={prevCard}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white hover:bg-stone-50 text-stone-300 hover:text-stone-900 transition-all shadow-md hidden md:flex active:scale-90 z-50 group border border-stone-100"
      >
        <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
      </button>

      <button
        onClick={nextCard}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white hover:bg-stone-50 text-stone-300 hover:text-stone-900 transition-all shadow-md hidden md:flex active:scale-90 z-50 group border border-stone-100"
      >
        <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default QuickDrill;
