
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, PenTool, MousePointer2, Trash2, FileText, ToggleLeft, ToggleRight, Layout } from 'lucide-react';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';
import { useSyncState } from '../../hooks/useSyncState';

interface PassageReadingProps {
  text: string;
  title?: string;
  sourceLabel?: string;
  questions?: string[];
  historyNote?: string;
  currentIndex?: number;
  onUpdateIndex?: (index: number) => void;
  strokes?: DrawingStroke[];
  onUpdateStrokes?: (strokes: DrawingStroke[]) => void;
  readOnly?: boolean;
  rulerEnabled?: boolean;
  onUpdateRulerEnabled?: (value: boolean) => void;
  rulerY?: number;
  onUpdateRulerY?: (value: number) => void;
}

const PassageReading: React.FC<PassageReadingProps> = ({
  text,
  title,
  sourceLabel,
  questions = [],
  historyNote,
  currentIndex: syncedIndex,
  onUpdateIndex,
  strokes,
  onUpdateStrokes,
  readOnly = false,
  rulerEnabled: syncedRulerEnabled,
  onUpdateRulerEnabled,
  rulerY: syncedRulerY,
  onUpdateRulerY
}) => {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  const [localIndex, setLocalIndex] = useState(0);
  const currentIndex = syncedIndex !== undefined ? syncedIndex : localIndex;

  const setCurrentIndex = (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(currentIndex) : val;
    if (onUpdateIndex) onUpdateIndex(next);
    else setLocalIndex(next);
  };
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('pen-blue');
  const [useRuler, setUseRuler] = useSyncState(syncedRulerEnabled, onUpdateRulerEnabled, false);
  const [rulerY, setRulerY] = useSyncState(syncedRulerY, onUpdateRulerY, 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const passageScrollRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const syncedDrawing = useSyncedDrawingCanvas({ strokes, onUpdateStrokes, tool, lineWidth: 4, readOnly });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        rectRef.current = rect;
      }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, paragraphs]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (useRuler && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const displayedY = e.clientY - rect.top;
      setRulerY(displayedY * (containerRef.current.clientHeight / rect.height));
    }
  };

  const handlePassageWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const scrollRegion = passageScrollRef.current;
    if (!scrollRegion || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

    const maxScrollTop = scrollRegion.scrollHeight - scrollRegion.clientHeight;
    if (maxScrollTop <= 0) return;

    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, scrollRegion.scrollTop + e.deltaY));
    if (nextScrollTop === scrollRegion.scrollTop) return;

    e.preventDefault();
    e.stopPropagation();
    scrollRegion.scrollTop = nextScrollTop;
  };

  const clearCanvas = () => {
    syncedDrawing.clear();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
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
    ctx.strokeStyle = tool === 'pen-blue' ? '#4338ca' : '#b91c1c';
    ctx.stroke();
  };

  const draw = (e: React.PointerEvent) => {
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

  const nextParagraph = () => {
    if (currentIndex < paragraphs.length - 1) {
      clearCanvas();
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevParagraph = () => {
    if (currentIndex > 0) {
      clearCanvas();
      setCurrentIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') nextParagraph();
      else if (e.key === 'ArrowLeft') prevParagraph();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, paragraphs, readOnly]);

  if (paragraphs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 italic font-serif">
        <FileText className="w-16 h-16 mb-4 opacity-30" />
        No passage content provided.
      </div>
    );
  }

  const showTeacherQuestions = !readOnly && (questions.length > 0 || Boolean(historyNote));

  return (
    <div className="min-h-full flex flex-col bg-[#fcfbf9] text-stone-900">
      <div className="h-20 bg-white border-b border-stone-100 flex items-center justify-between px-8 shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center gap-6 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-3 font-serif uppercase tracking-wider">
              <FileText className="w-5 h-5 text-red-800" />
              {title || 'Passage Reading'}
            </h2>
            {sourceLabel ? <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">{sourceLabel}</div> : null}
          </div>
          {!readOnly && <button
             onClick={() => setUseRuler(!useRuler)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${useRuler ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm' : 'bg-white border-stone-100 text-stone-300 hover:text-stone-900'}`}
          >
             <Layout className="w-3.5 h-3.5" />
             {useRuler ? "Ruler Active" : "Enable Ruler"}
          </button>}
        </div>

        {!readOnly && <div className="flex bg-stone-50 p-1 rounded-xl gap-1 border border-stone-100">
           <button
             onClick={() => setTool('cursor')}
             className={`p-3 rounded-lg ${tool === 'cursor' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-300 hover:text-stone-900'}`}
             title="Cursor Mode"
           >
             <MousePointer2 className="w-5 h-5" />
           </button>
           <button
             onClick={() => setTool('pen-blue')}
             className={`p-3 rounded-lg ${tool === 'pen-blue' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-300 hover:text-stone-900'}`}
             title="Blue Ink (Phrasing)"
           >
             <PenTool className="w-5 h-5" />
           </button>
           <button
             onClick={() => setTool('pen-red')}
             className={`p-3 rounded-lg ${tool === 'pen-red' ? 'bg-red-600 text-white shadow-sm' : 'text-stone-300 hover:text-stone-900'}`}
             title="Red Ink (Corrections)"
           >
             <PenTool className="w-5 h-5" />
           </button>
           <div className="w-px h-8 bg-stone-200 mx-1 self-center" />
           <button
             onClick={clearCanvas}
             className="p-3 rounded-lg text-stone-300 hover:text-red-600 transition-colors"
             title="Clear Canvas"
           >
             <Trash2 className="w-5 h-5" />
           </button>
        </div>}
      </div>

      <div
        className="flex-1 relative flex flex-col bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] overflow-hidden"
        ref={containerRef}
        onMouseMove={handleMouseMove}
      >
        {useRuler && (
          <div
            className="absolute left-0 right-0 h-16 bg-amber-400/5 border-y border-amber-400/20 z-10 pointer-events-none transition-all duration-75"
            style={{ top: `${rulerY - 32}px` }}
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-400/40"></div>
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber-400/40"></div>
          </div>
        )}

        {showTeacherQuestions && (
          <aside data-part9-teacher-questions className="absolute right-5 top-5 bottom-5 z-30 w-[350px] overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50/95 p-5 shadow-xl">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">Teacher only · comprehension</div>
            {historyNote ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3 text-xs font-semibold leading-relaxed text-stone-600">
                {historyNote}
              </div>
            ) : null}
            {questions.length > 0 ? (
              <ol className="mt-4 space-y-3 list-decimal pl-5 text-sm font-semibold leading-relaxed text-stone-800">
                {questions.map((question, index) => <li key={index}>{question}</li>)}
              </ol>
            ) : null}
          </aside>
        )}

        <button
          onClick={prevParagraph}
          disabled={readOnly || currentIndex === 0}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-white border border-stone-100 text-stone-300 hover:text-stone-900 disabled:opacity-0 transition-all shadow-sm active:scale-95 group"
        >
           <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={nextParagraph}
          disabled={readOnly || currentIndex === paragraphs.length - 1}
          className={`absolute top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-white border border-stone-100 text-stone-300 hover:text-stone-900 disabled:opacity-0 transition-all shadow-sm active:scale-95 group ${showTeacherQuestions ? 'right-[380px]' : 'right-6'}`}
        >
           <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>

        <div
          ref={passageScrollRef}
          data-part9-passage-scroll
          className={`absolute inset-0 flex p-4 md:p-12 lg:p-24 z-0 overflow-y-auto ${showTeacherQuestions ? 'pr-[390px]' : ''}`}
        >
          <div className="max-w-6xl w-full mx-auto my-auto py-12">
             <p className="text-[38px] font-medium text-stone-900 leading-[3] font-serif tracking-wide select-none text-left break-words">
                {paragraphs[currentIndex]}
             </p>
          </div>
        </div>

        <canvas
          ref={syncedDrawing.canvasRef}
          onPointerDown={syncedDrawing.onPointerDown}
          onPointerMove={syncedDrawing.onPointerMove}
          onPointerUp={syncedDrawing.onPointerUp}
          onPointerCancel={syncedDrawing.onPointerCancel}
          onWheel={handlePassageWheel}
          className={`absolute inset-0 z-20 touch-none ${readOnly || tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
        />

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 pointer-events-none z-30">
           {paragraphs.map((_, idx) => (
             <div
               key={idx}
               className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-red-800 scale-125' : 'bg-stone-200'}`}
             />
           ))}
        </div>
      </div>
    </div>
  );
};

export default PassageReading;
