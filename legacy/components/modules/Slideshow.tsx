
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Slide, SlideElement } from '../../types';
import { ChevronLeft, ChevronRight, PenTool, MousePointer2, Trash2, Maximize2, Minimize2, Star, MoveDiagonal, X, Quote, BookOpen, ShieldCheck, MonitorPlay, Presentation } from 'lucide-react';
import { parseWordToTiles, generateId, TileData } from '../../utils';
import Tile from '../Tile';
import CodingTray, { CodingMark } from './CodingTray';
import Draggable from '../interactive/Draggable';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';
import { useSyncState } from '../../hooks/useSyncState';
import { useLessonStageScale } from '../LessonStage';

interface SlideshowProps {
  slides: Slide[];
  googleSlidesUrl?: string;
  tool: 'cursor' | 'pen';
  currentIndex?: number;
  onUpdateIndex?: (index: number) => void;
  drawingStrokes?: DrawingStroke[];
  onUpdateDrawingStrokes?: (strokes: DrawingStroke[]) => void;
  readOnly?: boolean;
  slideMarks?: Record<number, CodingMark[]>;
  onUpdateSlideMarks?: (marks: Record<number, CodingMark[]>) => void;
  objectStates?: Record<number, Record<string, ObjectState>>;
  onUpdateObjectStates?: (states: Record<number, Record<string, ObjectState>>) => void;
  isFullScreenContent?: boolean;
  onUpdateFullScreenContent?: (value: boolean) => void;
}

export interface SlideshowRef {
  spawnMark: (type: CodingMark['type']) => void;
  clearMarks: () => void;
  clearCanvas: () => void;
}

export interface ObjectState {
  x: number;
  y: number;
  scale: number;
}

const Slideshow = forwardRef<SlideshowRef, SlideshowProps>(({ slides: incomingSlides,
  googleSlidesUrl,
  tool,
  currentIndex: syncedIndex,
  onUpdateIndex,
  drawingStrokes,
  onUpdateDrawingStrokes,
  readOnly = false,
  slideMarks: syncedSlideMarks,
  onUpdateSlideMarks,
  objectStates: syncedObjectStates,
  onUpdateObjectStates,
  isFullScreenContent: syncedFullScreenContent,
  onUpdateFullScreenContent
}, ref) => {
  const slides = (incomingSlides || [])
    .filter((slide): slide is Slide => Boolean(slide?.id))
    .map(slide => ({
      ...slide,
      elements: (slide.elements || []).filter((element): element is SlideElement => Boolean(element?.id))
    }));
  const [localIndex, setLocalIndex] = useState(0);
  const currentIndex = syncedIndex ?? localIndex;
  const setCurrentIndex = (value: number | ((previous: number) => number)) => {
    const next = typeof value === 'function' ? value(currentIndex) : value;
    if (onUpdateIndex) onUpdateIndex(next);
    else setLocalIndex(next);
  };
  const [isFullScreenContent, setIsFullScreenContent] = useSyncState(syncedFullScreenContent, onUpdateFullScreenContent, false);
  const [showNotes, setShowNotes] = useState(true);
  const [slideMarks, setSlideMarks] = useSyncState(syncedSlideMarks, onUpdateSlideMarks, {} as Record<number, CodingMark[]>);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const syncedDrawing = useSyncedDrawingCanvas({
    strokes: drawingStrokes,
    onUpdateStrokes: onUpdateDrawingStrokes,
    tool,
    lineWidth: 6,
    readOnly
  });

  const [objectStates, setObjectStates] = useSyncState(syncedObjectStates, onUpdateObjectStates, {} as Record<number, Record<string, ObjectState>>);

  const [contentScale, setContentScale] = useState(1);
  const lessonStageScale = useLessonStageScale();

  useImperativeHandle(ref, () => ({
    spawnMark: (type: CodingMark['type']) => {
      const newMark: CodingMark = {
        id: generateId(),
        type,
        x: 0,
        y: 0,
        scale: 1.5
      };
      setSlideMarks(prev => ({
        ...prev,
        [currentIndex]: [...(prev[currentIndex] || []), newMark]
      }));
    },
    clearMarks: () => {
      setSlideMarks(prev => ({ ...prev, [currentIndex]: [] }));
    },
    clearCanvas: () => {
      syncedDrawing.clear();
    }
  }));

  const currentSlide = slides[currentIndex];

  useEffect(() => {
    const handleResize = () => {
      if (slideContainerRef.current) {
        const width = slideContainerRef.current.clientWidth;
        const height = slideContainerRef.current.clientHeight;
        if (!width || !height) return;
        rectRef.current = slideContainerRef.current.getBoundingClientRect();

        // Calculate the scale to fit 1600x900 inside the container
        const scaleX = width / 1600;
        const scaleY = height / 900;
        setContentScale(Math.min(scaleX, scaleY));
      }
    };
    const container = slideContainerRef.current;
    const observer = container && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (container) observer?.observe(container);
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [currentIndex, isFullScreenContent]);

  const updateObjectState = (id: string, updates: Partial<ObjectState>) => {
    setObjectStates(prev => ({
      ...prev,
      [currentIndex]: {
        ...(prev[currentIndex] || {}),
        [id]: {
          ...(prev[currentIndex]?.[id] || { x: 0, y: 0, scale: 1 }),
          ...updates
        }
      }
    }));
  };

  const spawnMark = (type: CodingMark['type']) => {
    if (!slideContainerRef.current) return;
    const newMark: CodingMark = {
      id: generateId(),
      type,
      x: 0,
      y: 0,
      scale: 1.5
    };
    setSlideMarks(prev => ({
      ...prev,
      [currentIndex]: [...(prev[currentIndex] || []), newMark]
    }));
  };

  const updateMark = (id: string, updates: Partial<CodingMark>) => {
    setSlideMarks(prev => ({
      ...prev,
      [currentIndex]: (prev[currentIndex] || []).map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  };

  const clearMarks = () => {
    setSlideMarks(prev => ({ ...prev, [currentIndex]: [] }));
  };

  const renderMarkContent = (mark: CodingMark) => {
    const commonStyles = "text-red-700 font-black drop-shadow-lg select-none pointer-events-none transition-colors";
    switch (mark.type) {
      case 'macron': return <span className={`${commonStyles} text-5xl leading-none`}>¯</span>;
      case 'breve': return <span className={`${commonStyles} text-5xl leading-none`}>˘</span>;
      case 'cross': return <span className={`${commonStyles} text-6xl opacity-90 leading-none`}>×</span>;
      case 'star': return <Star className="w-10 h-10 text-red-600 fill-current drop-shadow-md" />;
      case 'scoop': return <span className={`${commonStyles} text-[5rem] font-medium leading-none`}>⌣</span>;
      case 'accent': return <span className={`${commonStyles} text-5xl leading-none`}>´</span>;
      case 'dot': return <span className={`${commonStyles} text-6xl leading-none`}>·</span>;
      default: return null;
    }
  };

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
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#b91c1c';
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

  const nextSlide = () => {
    if (currentIndex < slides.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const renderResizableHandle = (id: string, currentScale: number) => readOnly ? null : (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        const startX = e.clientX;
        const startScale = currentScale;
        const handleMove = (moveEvent: PointerEvent) => {
          const delta = (moveEvent.clientX - startX) / 100;
          updateObjectState(id, { scale: Math.max(0.5, Math.min(5, startScale + delta)) });
        };
        const handleUp = () => {
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerup', handleUp);
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
      }}
      className="absolute -bottom-4 -right-4 w-10 h-10 bg-white text-stone-300 rounded-full flex items-center justify-center shadow-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-stone-100 hover:text-stone-600"
    >
      <MoveDiagonal className="w-4 h-4" />
    </div>
  );

  const renderIndependentTile = (tile: TileData, tileId: string, initialX: number, initialY: number) => {
    if (tile.type === 'space') return null;
    return (
      <div key={tileId} className="group" style={{ transform: `translate(${initialX}px, ${initialY}px)` }}>
        <Tile data={tile} size="xl" />
      </div>
    );
  };

  const renderNormalElement = (el: SlideElement) => {
    const defaultX = (el.type === 'text' && (el.x === 0 || !el.x)) ? -700 : (el.x || 0);
    const defaultY = (el.type === 'text' && (el.y === 0 || !el.y)) ? -280 : (el.y || 0);

    return (
      <div
        key={el.id}
        className="group absolute"
        style={{ transform: `translate(${defaultX}px, ${defaultY}px) scale(${el.scale || 1})` }}
      >
        {el.type === 'image' ? (
          <img src={el.content} alt="Slide Element" className="max-w-md shadow-sm rounded-xl border border-stone-100" />
        ) : (
          <div className="bg-white/50 backdrop-blur-sm p-10 rounded-2xl border border-stone-200/40 w-fit max-w-[1400px] min-w-[200px] flex items-center justify-center">
             <p className="text-5xl font-serif text-stone-700 leading-tight text-left italic whitespace-pre-wrap w-full">{el.content}</p>
          </div>
        )}
      </div>
    );
  };

  const estimateTileWidth = (text: string, size: string) => {
    const baseWidths = { sm: 32, md: 56, lg: 72, xl: 88, '2xl': 128 };
    const padding = { sm: 16, md: 24, lg: 32, xl: 40, '2xl': 48 };
    const charWidth = { sm: 10, md: 16, lg: 24, xl: 28, '2xl': 36 };

    const base = baseWidths[size as keyof typeof baseWidths] || 88;
    const pad = padding[size as keyof typeof padding] || 40;
    const char = charWidth[size as keyof typeof charWidth] || 28;

    return Math.max(base, pad + text.length * char);
  };

  return (
    <div className="h-full flex flex-col bg-[#fcfbf9] relative overflow-hidden">
      {/* GOOGLE SLIDES EMBED MODE */}
      {googleSlidesUrl && (slides.length === 0 || currentIndex === -1) ? (
        <div className="flex-1 flex flex-col">
           <div className="flex-1 bg-black relative">
              <iframe
                src={googleSlidesUrl.replace('/edit', '/embed').replace('/pub', '/embed')}
                className="w-full h-full border-none"
                allowFullScreen
              />
           </div>
           <div className="h-20 bg-white border-t border-stone-100 flex items-center justify-center px-8">
              <button onClick={() => setCurrentIndex(0)} className="text-stone-300 hover:text-stone-900 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                 <MonitorPlay className="w-4 h-4" /> Switch to Dojo Slides
              </button>
           </div>
        </div>
      ) : (
        <>
          {!readOnly && <div className="absolute top-6 left-8 z-50 flex gap-2">
              {googleSlidesUrl && (
                <button
                  onClick={() => setCurrentIndex(-1)}
                  className="p-3.5 bg-white text-stone-300 hover:text-stone-900 rounded-2xl border border-stone-100 shadow-sm transition-all hover:scale-105"
                  title="Switch to Google Slides"
                >
                  <Presentation className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowNotes(!showNotes)}
                className={`p-3.5 rounded-2xl border transition-all hover:scale-105 ${showNotes ? 'bg-stone-900 text-white border-stone-900 shadow-md' : 'bg-white text-stone-300 border-stone-100 shadow-sm'}`}
                title="Toggle Sensei Notes"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button onClick={() => setIsFullScreenContent(!isFullScreenContent)} className="p-3.5 bg-white text-stone-300 hover:text-stone-900 rounded-2xl border border-stone-100 shadow-sm transition-all hover:scale-105">
                {isFullScreenContent ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
          </div>}

          <div className={`flex-1 flex items-center justify-center transition-all duration-1000 ${isFullScreenContent ? 'p-0' : 'p-12'}`}>
            <div ref={slideContainerRef} className={`bg-white relative shadow-[0_20px_50px_rgba(0,0,0,0.05)] ${isFullScreenContent ? 'w-full h-full' : 'w-full max-w-full aspect-[16/9] rounded-[2rem] border border-stone-100'} overflow-hidden flex flex-col`}>

              <div className="absolute top-0 left-0 w-full h-1 flex z-50">
                 {slides.map((_, idx) => (
                    <div key={idx} className={`flex-1 transition-all duration-500 ${idx <= currentIndex ? 'bg-red-800' : 'bg-stone-50'}`} />
                 ))}
              </div>

               <div className="flex-1 overflow-hidden relative z-0 bg-stone-50">
                 {/* Clean Background Layer */}
                 <div className="absolute inset-0 z-[-1] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-5" />

                 {/* THE CANVAS WRAPPER: Fixed coordinate origin */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <div className="relative w-1 h-1 pointer-events-auto" style={{ transform: `scale(${contentScale})` }}>
                        {/* TEMPLATE MODE: Standardized layout for manual slides */}
                        {currentSlide?.type === 'template' ? (
                           <div className="absolute inset-0 flex flex-col p-12 w-[1600px] h-[900px] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                               {/* Top Section: Optional Title and Text Boxes */}
                               <div className="w-full flex-shrink-0 flex flex-col items-center gap-6 z-10">
                                  {/* Optional Title - only if explicitly provided */}
                                  {currentSlide.title && (
                                     <h1 className="text-3xl font-black text-stone-300 uppercase tracking-[0.6em] text-center w-full">
                                        {currentSlide.title}
                                     </h1>
                                  )}

                                  {/* Simplified Text Boxes - Full width, centered text */}
                                  <div className="w-full flex flex-col gap-4 items-center">
                                     {currentSlide.elements?.filter(el => el?.id && el.type === 'text').map((el) => (
                                        <div key={el.id} className="text-center w-full max-w-[1400px]">
                                           <div className="px-12 py-6 bg-stone-50/50 rounded-2xl border border-stone-200/50 shadow-sm inline-block min-w-[60%] mx-auto">
                                             <p className="text-3xl font-serif text-stone-600 leading-relaxed italic whitespace-pre-wrap text-center">
                                                {el.content}
                                             </p>
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                               </div>

                               {/* Center Section: Main Word Tiles (Grows to fill space) */}
                               <div className="flex-1 flex items-center justify-center w-full z-0 px-24">
                                  <div className="flex items-end justify-center gap-2 flex-wrap max-w-full">
                                     {parseWordToTiles(currentSlide.content).map((tile, tIdx, all) => {
                                        const tilesCount = all.length;
                                        const baseSize = tilesCount > 10 ? 'lg' : tilesCount > 6 ? 'xl' : '2xl';
                                        const tileId = `template-tile-${tIdx}`;

                                        return (
                                           <div key={tileId} className="transition-all duration-300 pointer-events-auto transform hover:scale-105">
                                              <Tile data={tile} size={baseSize as any} rounding="all" />
                                           </div>
                                        );
                                     })}
                                  </div>
                               </div>

                              {/* Bottom Section: Images (Preventing overlap) */}
                              <div className="w-full h-32 flex-shrink-0 flex items-center justify-center gap-8 z-10 mt-auto pb-8">
                                 {currentSlide.elements?.filter(el => el.type === 'image').map((el) => (
                                    <div key={el.id} className="transition-all duration-500 hover:scale-110 pointer-events-auto h-full">
                                       <img
                                          src={el.content}
                                          alt="Slide Illustration"
                                          className="h-full w-auto shadow-2xl rounded-2xl border-2 border-white/20 object-contain"
                                          referrerPolicy="no-referrer"
                                       />
                                    </div>
                                 ))}
                              </div>
                           </div>
                        ) : (
                          <>
                             {/* Legacy Fallback: If no elements but has content, render a centered element */}
                             {currentSlide && (!currentSlide.elements || currentSlide.elements.length === 0) && currentSlide.content && (
                               currentSlide.type === 'word' ? (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="flex items-end justify-center gap-[2px] pointer-events-auto">
                                         {parseWordToTiles(currentSlide.content).map((tile, tIdx, all) => {
                                            const tileId = `legacy-tile-${tIdx}`;
                                            return (
                                               <div key={tileId} className="transition-all duration-300 hover:-translate-y-4">
                                                  <Tile data={tile} size="xl" rounding="all" />
                                               </div>
                                            );
                                         })}
                                      </div>
                                  </div>
                               ) : (
                                  renderNormalElement({
                                    id: 'legacy-content',
                                    type: currentSlide.type === 'image' ? 'image' : 'text',
                                    content: currentSlide.content,
                                    x: 0,
                                    y: 0,
                                    scale: 1.2
                                  })
                               )
                             )}

                             {currentSlide?.elements?.filter((el): el is SlideElement => Boolean(el?.id)).map((el) => {
                                if (el.type === 'word') {
                                  const tiles = parseWordToTiles(el.content);
                                  let currentX = el.x || -200;
                                  return tiles.map((tile, tIdx) => {
                                    if (tile.type === 'space') {
                                      currentX += 40;
                                      return null;
                                    }
                                    const tileId = `${el.id}-tile-${tIdx}`;
                                    const tileWidth = estimateTileWidth(tile.text, 'xl');
                                    const initialX = currentX;
                                    currentX += tileWidth + 2;

                                    const tilesCount = tiles.filter(t => t.type !== 'space').length;
                                    let rounding: 'all' | 'left' | 'right' | 'none' = 'all';
                                    if (tilesCount > 1) {
                                       if (tIdx === 0) rounding = 'left';
                                       else if (tIdx === tiles.length - 1) rounding = 'right';
                                       else rounding = 'none';
                                    }

                                    const state = objectStates[currentIndex]?.[tileId] || { x: initialX, y: el.y || 0, scale: el.scale || 1 };

                                    return (
                                      <Draggable
                                        key={tileId}
                                        initialPos={{ x: state.x, y: state.y }}
                                        onDragEnd={(pos) => !readOnly && updateObjectState(tileId, pos)}
                                        viewportScale={contentScale * lessonStageScale}
                                        className={readOnly ? 'pointer-events-none' : 'group'}
                                      >
                                        <div className="transition-transform duration-200" style={{ transform: `scale(${state.scale})` }}>
                                          <Tile data={tile} size="xl" rounding="all" />
                                          {renderResizableHandle(tileId, state.scale)}
                                        </div>
                                      </Draggable>
                                    );
                                  });
                                }
                                return renderNormalElement(el);
                             })}
                          </>
                       )}

                       {(slideMarks[currentIndex] || []).map(mark => (
                        <Draggable
                          key={mark.id}
                          initialPos={{ x: mark.x, y: mark.y }}
                          onDragEnd={(pos) => !readOnly && updateMark(mark.id, pos)}
                          viewportScale={contentScale * lessonStageScale}
                          className={readOnly ? 'pointer-events-none' : 'pointer-events-auto'}
                        >
                           <div className="relative group/mark flex items-center justify-center transition-all hover:scale-110 active:scale-125 cursor-grab active:cursor-grabbing p-4">
                              {renderMarkContent(mark)}
                              {!readOnly && <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSlideMarks(prev => ({
                                    ...prev,
                                    [currentIndex]: (prev[currentIndex] || []).filter(m => m.id !== mark.id)
                                  }));
                                }}
                                className="absolute -top-6 -right-6 w-8 h-8 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover/mark:opacity-100 transition-opacity z-50 hover:bg-red-600"
                              >
                                <X size={14} />
                              </button>}
                           </div>
                        </Draggable>
                      ))}
                    </div>
                 </div>

                 {currentSlide && (!currentSlide.elements || currentSlide.elements.length === 0) && !currentSlide.content && (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-300 font-serif italic text-4xl pointer-events-none">Empty Mission Scroll</div>
                 )}
              </div>

              <canvas
                ref={syncedDrawing.canvasRef}
                onPointerDown={syncedDrawing.onPointerDown}
                onPointerMove={syncedDrawing.onPointerMove}
                onPointerUp={syncedDrawing.onPointerUp}
                onPointerCancel={syncedDrawing.onPointerCancel}
                className={`absolute inset-0 z-20 touch-none ${readOnly || tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
              />

              {/* SENSEI NOTES OVERLAY (Ultra-Light Zen Mode) */}
              {!readOnly && !isFullScreenContent && showNotes && currentSlide?.notes && (
                <div className="absolute bottom-10 left-12 right-12 z-50 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="max-w-4xl bg-white/80 backdrop-blur-2xl px-12 py-8 rounded-[2rem] border border-stone-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex items-start gap-8 relative group">
                      <div className="mt-1 opacity-10 group-hover:opacity-40 transition-opacity">
                         <Quote className="w-8 h-8 text-stone-900" />
                      </div>
                      <div className="flex-1">
                         <p className="text-stone-500 font-serif italic text-2xl leading-relaxed text-left tracking-tight">
                           {currentSlide.notes}
                         </p>
                      </div>
                      <button onClick={() => setShowNotes(false)} className="opacity-0 group-hover:opacity-20 hover:!opacity-100 transition-opacity p-2 -mr-4 text-stone-400">
                        <X className="w-5 h-5" />
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-20 flex items-center justify-between px-16 z-40 relative">
            <button onClick={prevSlide} disabled={readOnly || currentIndex <= 0} className="flex items-center gap-4 text-stone-300 hover:text-stone-900 disabled:opacity-0 transition-all font-black uppercase tracking-[0.4em] text-[10px] group">
              <ChevronLeft className="w-6 h-6" /> Previous
            </button>

            <div className="flex gap-2">
               {slides.map((_, idx) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentIndex ? 'bg-stone-900' : 'bg-stone-200'}`} />
               ))}
            </div>

            <button onClick={nextSlide} disabled={readOnly || currentIndex === slides.length - 1} className="flex items-center gap-4 text-stone-300 hover:text-stone-900 disabled:opacity-0 transition-all font-black uppercase tracking-[0.4em] text-[10px] group">
              Next <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default Slideshow;
