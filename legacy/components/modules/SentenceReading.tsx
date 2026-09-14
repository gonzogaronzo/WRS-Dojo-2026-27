
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, PenTool, Eraser, Trash2, MousePointer2 } from 'lucide-react';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';

interface SentenceReadingProps {
  sentences: string[];
  weaveQuestions?: string[];
  currentIndex?: number;
  onUpdateIndex?: (index: number) => void;
  strokes?: DrawingStroke[];
  onUpdateStrokes?: (strokes: DrawingStroke[]) => void;
  readOnly?: boolean;
}

const SentenceReading: React.FC<SentenceReadingProps> = ({ 
  sentences,
  weaveQuestions = [],
  currentIndex: syncedIndex,
  onUpdateIndex,
  strokes,
  onUpdateStrokes,
  readOnly = false
}) => {
  const [localIndex, setLocalIndex] = useState(0);
  const currentIndex = syncedIndex !== undefined ? syncedIndex : localIndex;

  const setCurrentIndex = (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(currentIndex) : val;
    if (onUpdateIndex) onUpdateIndex(next);
    else setLocalIndex(next);
  };
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('pen-blue');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number, y: number} | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const syncedDrawing = useSyncedDrawingCanvas({ strokes, onUpdateStrokes, tool, lineWidth: 4, readOnly });

  // Handle Resize
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
  }, []);

  const clearCanvas = () => {
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

  const nextSentence = () => {
    if (currentIndex < sentences.length - 1) {
      clearCanvas();
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevSentence = () => {
    if (currentIndex > 0) {
      clearCanvas();
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (sentences.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-stone-400 italic font-serif">
        No sentences configured for this mission.
      </div>
    );
  }

  const weaveQuestion = weaveQuestions[currentIndex]?.trim();

  return (
    <div className="min-h-full flex flex-col bg-[#fcfbf9] text-stone-900">
      {/* Toolbar */}
      <div className="h-20 bg-white border-b border-stone-100 flex items-center justify-between px-8 shadow-sm z-30">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-3 font-serif uppercase tracking-wider">
          <PenTool className="w-5 h-5 text-red-800" />
          Fluency Canvas
        </h2>
        
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

      {/* Canvas / Text Area */}
      <div className="flex-1 relative flex flex-col bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]" ref={containerRef}>
        {!readOnly && weaveQuestion && (
          <div data-part5-teacher-weave className="absolute top-5 left-1/2 -translate-x-1/2 z-30 w-[min(90%,56rem)] rounded-2xl border border-amber-200 bg-amber-50/95 px-5 py-3 shadow-sm">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1">Teacher weave question</div>
            <div className="text-sm font-bold text-stone-800">{weaveQuestion}</div>
          </div>
        )}
        
        {/* Navigation Buttons (Visible & Interactive) */}
        <button 
          onClick={prevSentence}
          disabled={readOnly || currentIndex === 0}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-white border border-stone-100 text-stone-300 hover:text-stone-900 disabled:opacity-0 transition-all shadow-sm active:scale-95 group"
        >
           <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>

        <button 
          onClick={nextSentence}
          disabled={readOnly || currentIndex === sentences.length - 1}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-4 rounded-full bg-white border border-stone-100 text-stone-300 hover:text-stone-900 disabled:opacity-0 transition-all shadow-sm active:scale-95 group"
        >
           <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>

        {/* Text Layer */}
        <div className="absolute inset-0 flex items-center justify-center p-8 md:p-16 lg:p-24 select-none pointer-events-none z-0">
          <p className="text-[64px] font-medium text-stone-900 text-center leading-tight font-serif tracking-tight w-full break-words">
            {sentences[currentIndex]}
          </p>
        </div>

        {/* Drawing Layer */}
        <canvas
          ref={syncedDrawing.canvasRef}
          onPointerDown={syncedDrawing.onPointerDown}
          onPointerMove={syncedDrawing.onPointerMove}
          onPointerUp={syncedDrawing.onPointerUp}
          onPointerCancel={syncedDrawing.onPointerCancel}
          className={`absolute inset-0 z-20 touch-none ${readOnly || tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
        />

        {/* Pagination Dots */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 pointer-events-none z-30">
           {sentences.map((_, idx) => (
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

export default SentenceReading;
