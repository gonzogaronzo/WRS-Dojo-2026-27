import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Lesson, Slide, WordCard } from '../../types';
import Slideshow, { ObjectState, SlideshowRef } from './Slideshow';
import Part2InteractiveRunner from './Part2InteractiveRunner';
import GenericText from './GenericText';
import { parseWordToTiles, getTileColor, generateId, TileData, splitIntoSyllables } from '../../utils';
import { getTilesForStep, getPhonemeForGrapheme, getOptionsForPhoneme } from '../../masterCurriculum';
import Tile from '../Tile';
import { useSyncState } from '../../hooks/useSyncState';
import {
  MonitorPlay, BookOpen, Grid3X3, Eraser, Delete, PlusCircle,
  X, Edit3, Type, Sparkles, ScrollText, Info, CheckCircle2,
  Gamepad2, ArrowDown, Check, PenTool, MousePointer2, Trash2,
  ChevronLeft, ChevronRight, LayoutPanelLeft, List, Zap, Quote,
  PanelRightClose, PanelRightOpen, Plus, Minus, Type as TypeIcon, Star, MoveDiagonal,
  Trophy, PartyPopper, Columns
} from 'lucide-react';
import CodingTray, { CodingMark } from './CodingTray';
import Draggable from '../interactive/Draggable';
import CodingMarkContent from '../CodingMarkContent';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';
import { part2InteractivePresentationFromData } from '../../part2Presentation';

interface TeachConceptsProps {
  lesson: Lesson;
  isSpelling?: boolean;
  onUpdateLesson?: (lesson: Lesson) => void;
  onUpdateNotes?: (notes: string | ((prev: string) => string)) => void;
  notes?: string;
  onAddToInventory?: (text: string) => void;
  initialMode?: 'slides' | 'notes' | 'board' | 'cipher';
  // Sync props
  mode?: 'slides' | 'notes' | 'board' | 'cipher';
  onUpdateMode?: (mode: 'slides' | 'notes' | 'board' | 'cipher') => void;
  boardText?: string;
  onUpdateBoardText?: (text: string) => void;
  boardTitle?: string;
  onUpdateBoardTitle?: (title: string) => void;
  boardNotes?: string;
  onUpdateBoardNotes?: (notes: string) => void;
  marks?: CodingMark[];
  onUpdateMarks?: (marks: CodingMark[]) => void;
  activeCipherIdx?: number;
  onUpdateCipherIdx?: (idx: number) => void;
  isSyllabicated?: boolean;
  onUpdateSyllabicated?: (val: boolean) => void;
  slideIndex?: number;
  onUpdateSlideIndex?: (index: number) => void;
  drawingStrokes?: DrawingStroke[];
  onUpdateDrawingStrokes?: (strokes: DrawingStroke[]) => void;
  readOnly?: boolean;
  cipherResults?: Record<number, TileData>;
  onUpdateCipherResults?: (results: Record<number, TileData>) => void;
  cipherCheckResult?: 'correct' | 'incorrect' | null;
  onUpdateCipherCheckResult?: (result: 'correct' | 'incorrect' | null) => void;
  slideMarks?: Record<number, CodingMark[]>;
  onUpdateSlideMarks?: (marks: Record<number, CodingMark[]>) => void;
  slideObjectStates?: Record<number, Record<string, ObjectState>>;
  onUpdateSlideObjectStates?: (states: Record<number, Record<string, ObjectState>>) => void;
  slideFullScreen?: boolean;
  onUpdateSlideFullScreen?: (value: boolean) => void;
}

const PHYSICAL_JOURNAL_MAP = {
  alphabet: [
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['g', 'h', 'i', 'j', 'k', 'l'],
    ['m', 'n', 'o', 'p', 'qu', 'r', 's'],
    ['t', 'u', 'v', 'w', 'x', 'y', 'z']
  ],
  digraphs: ['wh', 'ch', 'sh', 'th', 'ck', 'tch', 'dge'],
  welded: {
    ng: ['ang', 'ing', 'ong', 'ung'],
    nk: ['ank', 'ink', 'onk', 'unk'],
    standard: ['all', 'am', 'an'],
    exceptions: ['ild', 'ind', 'old', 'olt', 'ost']
  },
  commonAffixes: {
    prefixes: ['un', 're', 'in', 'im', 'dis', 'pre'],
    suffixes: ['s', 'es', 'ed', 'ing', 'ly', 'less', 'ness', 'ful', 'y']
  }
};

const CIPHER_WORDS_71 = ['decent', 'giant', 'suggest', 'place', 'stingy', 'engage', 'fancy'];

const TeachConcepts: React.FC<TeachConceptsProps> = ({
  lesson,
  isSpelling = false,
  onUpdateLesson,
  onUpdateNotes,
  notes,
  onAddToInventory,
  initialMode: forcedInitialMode,
  mode: syncedMode,
  onUpdateMode,
  boardText: syncedBoardText,
  onUpdateBoardText,
  boardTitle: syncedBoardTitle,
  onUpdateBoardTitle,
  boardTitle: _boardTitleSync, // unused but sometimes passed
  boardNotes: syncedBoardNotes,
  onUpdateBoardNotes,
  marks: syncedMarks,
  onUpdateMarks,
  activeCipherIdx: syncedCipherIdx,
  onUpdateCipherIdx,
  isSyllabicated: syncedSyllabicated,
  onUpdateSyllabicated,
  slideIndex,
  onUpdateSlideIndex,
  drawingStrokes,
  onUpdateDrawingStrokes,
  readOnly = false,
  cipherResults: syncedCipherResults,
  onUpdateCipherResults,
  cipherCheckResult: syncedCipherCheckResult,
  onUpdateCipherCheckResult,
  slideMarks,
  onUpdateSlideMarks,
  slideObjectStates,
  onUpdateSlideObjectStates,
  slideFullScreen,
  onUpdateSlideFullScreen
}) => {
  // The runner is opt-in from source data. Existing semantic Part 2 slides
  // remain the production fallback for lessons that have not supplied steps.
  const interactivePart2Presentation = !isSpelling
    ? part2InteractivePresentationFromData(lesson.runtimePlan?.parts.find(part => part.part === 2)?.data)
    : null;
  const hasInteractivePart2 = Boolean(interactivePart2Presentation);
  const [publicMode, setPublicMode] = useSyncState(syncedMode, onUpdateMode, (() => {
    if (forcedInitialMode) return forcedInitialMode;
    if (isSpelling) return (lesson.cipherWords && lesson.cipherWords.length > 0) ? 'cipher' : 'board';
    return (hasInteractivePart2 || lesson.slides?.length > 0 || lesson.googleSlidesUrl) ? 'slides' : 'board';
  })() as 'slides' | 'notes' | 'board' | 'cipher');
  const [showTeacherNotes, setShowTeacherNotes] = useState(false);
  const audienceMode = publicMode === 'notes' ? 'board' : publicMode;
  const mode = showTeacherNotes && !readOnly ? 'notes' : audienceMode;
  const setMode = (nextMode: 'slides' | 'notes' | 'board' | 'cipher') => {
    if (nextMode === 'notes') {
      if (!readOnly) setShowTeacherNotes(true);
      return;
    }
    setShowTeacherNotes(false);
    setPublicMode(nextMode);
  };

  const [isSyllabicated, setIsSyllabicated] = useSyncState(syncedSyllabicated, onUpdateSyllabicated, false);
  const [boardText, setBoardText] = useSyncState(syncedBoardText, onUpdateBoardText, '');
  const [boardTitle, setBoardTitle] = useSyncState(syncedBoardTitle, onUpdateBoardTitle, '');
  const [boardNotes, setBoardNotes] = useSyncState(syncedBoardNotes, onUpdateBoardNotes, '');
  const [marks, setMarks] = useSyncState(syncedMarks, onUpdateMarks, [] as CodingMark[]);
  const [activeCipherIdx, setActiveCipherIdx] = useSyncState(syncedCipherIdx, onUpdateCipherIdx, 0);

  const [tool, setTool] = useState<'cursor' | 'pen'>('cursor');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardDisplayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const syncedDrawing = useSyncedDrawingCanvas({
    strokes: drawingStrokes,
    onUpdateStrokes: onUpdateDrawingStrokes,
    tool,
    lineWidth: 6,
    readOnly
  });

   const slideshowRef = useRef<SlideshowRef>(null);

  const spawnMark = (type: CodingMark['type']) => {
    if (mode === 'slides' && slideshowRef.current) {
      slideshowRef.current.spawnMark(type);
      return;
    }
    if (!boardDisplayRef.current) return;
    const newMark: CodingMark = {
      id: generateId(),
      type,
      x: boardDisplayRef.current.clientWidth / 2 - 15,
      y: boardDisplayRef.current.clientHeight / 2 - 15,
      scale: 0.7
    };
    setMarks(prev => [...prev, newMark]);
  };

  const clearMarks = () => {
    if (mode === 'slides' && slideshowRef.current) {
      slideshowRef.current.clearMarks();
      return;
    }
    setMarks([]);
  };

  const updateMark = (id: string, updates: Partial<CodingMark>) => {
    setMarks((prev: CodingMark[]) => prev.filter(Boolean).map((m: CodingMark) => m.id === id ? { ...m, ...updates } : m));
  };

  const visibleMarks = (marks || []).filter((mark): mark is CodingMark => Boolean(mark?.id));

  const [displayTiles, setDisplayTiles] = useState<(TileData & { isCipher?: boolean, phoneme?: string })[]>([]);
  const [cipherResults, setCipherResults] = useSyncState(syncedCipherResults, onUpdateCipherResults, {} as Record<number, TileData>);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [checkResult, setCheckResult] = useSyncState(syncedCipherCheckResult, onUpdateCipherCheckResult, null as 'correct' | 'incorrect' | null);
  const [completedCipherIndices, setCompletedCipherIndices] = useState<Set<number>>(new Set());

  const cipherWords = useMemo(() => {
    return (lesson.step === '7' && lesson.substep === '1') ? CIPHER_WORDS_71 : (lesson.cipherWords || []);
  }, [lesson.step, lesson.substep, lesson.cipherWords]);

  const banks = useMemo(() => getTilesForStep(lesson.step, lesson.substep), [lesson.step, lesson.substep]);

  const allUnlockedItems = useMemo(() => {
    const basic = [
      ...PHYSICAL_JOURNAL_MAP.alphabet.flat(),
      ...PHYSICAL_JOURNAL_MAP.digraphs,
      ...PHYSICAL_JOURNAL_MAP.welded.standard,
      ...PHYSICAL_JOURNAL_MAP.welded.ng,
      ...PHYSICAL_JOURNAL_MAP.welded.nk,
      ...PHYSICAL_JOURNAL_MAP.welded.exceptions,
      ...PHYSICAL_JOURNAL_MAP.commonAffixes.prefixes,
      ...PHYSICAL_JOURNAL_MAP.commonAffixes.suffixes
    ];
    const fromBanks = Object.values(banks).flat().map((s: any) => (s as string).toLowerCase());
    return Array.from(new Set([...basic, ...fromBanks]));
  }, [banks]);

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
    if (mode === 'cipher') setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode]);

  const clearCanvas = () => {
    if (mode === 'slides' && slideshowRef.current) {
      slideshowRef.current.clearCanvas();
      return;
    }
    syncedDrawing.clear();
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (tool === 'cursor') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture pointer to continue drawing even if it leaves the canvas
    (e.target as Element).setPointerCapture(e.pointerId);

    rectRef.current = canvas.getBoundingClientRect();
    const x = e.clientX - rectRef.current.left;
    const y = e.clientY - rectRef.current.top;

    lastPointRef.current = { x, y };
    setIsDrawing(true);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y); // Dot
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

  const [isDrawing, setIsDrawing] = useState(false);
  const stopDrawing = (e: React.PointerEvent) => {
    if (isDrawing) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setIsDrawing(false);
      lastPointRef.current = null;
    }
  };

  const handleTileClick = (text: string) => {
    setBoardText(prev => prev + text);
    inputRef.current?.focus();
  };

  const handleTileTextEdit = (tile: TileData, newValue: string) => {
    if (tile.startIndex === undefined || tile.endIndex === undefined) return;

    let before = boardText.substring(0, tile.startIndex);
    let after = boardText.substring(tile.endIndex);

    const source = boardText.substring(tile.startIndex, tile.endIndex);
    if (tile.type === 'syllable' && source.startsWith('|') && source.endsWith('|')) {
      before += '|';
      after = '|' + after;
    } else if (tile.type === 'vowel' && source.startsWith('[') && source.endsWith(']')) {
      before += '[';
      after = ']' + after;
    } else if (tile.type === 'consonant' && source.startsWith('{') && source.endsWith('}')) {
      before += '{';
      after = '}' + after;
    } else if (tile.type === 'welded' && source.startsWith('/') && source.endsWith('/')) {
      before += '/';
      after = '/' + after;
    } else if (tile.type === 'suffix' && source.startsWith('<') && source.endsWith('>')) {
      before += '<';
      after = '>' + after;
    } else if (tile.type === 'prefix' && source.endsWith('-')) {
      after = '-' + after;
    } else if (tile.type === 'suffix' && source.startsWith('-')) {
      before += '-';
    }

    setBoardText(before + newValue + after);
  };

  const addSyllableTile = () => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = boardText;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + '||' + after;
      setBoardText(newText);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + 1, start + 1);
      }, 0);
    } else {
      setBoardText(prev => prev + '||');
    }
  };

  const clearBoard = () => {
    setBoardText('');
    setMarks([]);
  };

  const backspace = () => {
    setBoardText(prev => prev.slice(0, -1));
  };

  const handleSaveAsSlide = () => {
    if (!boardText.trim() || !onUpdateLesson) return;
    const cleanTitle = boardTitle.trim();
    const cleanContent = boardText.trim();
    // Clean markers: |w| -> w, {v} -> v, etc.
    const plainWord = cleanContent.replace(/[|{}[\]/<>-]/g, '');

    const newSlide: Slide = {
      id: generateId(),
      type: 'template',
      title: cleanTitle,
      content: cleanContent,
      elements: boardNotes.trim() ? [{ id: generateId(), type: 'text', content: boardNotes.trim(), x: 0, y: 0, scale: 1 }] : []
    };

    const updatedLesson: Lesson = {
      ...lesson,
      slides: [...(lesson.slides || []), newSlide],
      wordListReading: [...(lesson.wordListReading || []), plainWord],
    };

    const currentWordCards = lesson.wordCards || [];
    if (!currentWordCards.some(c => c.text === plainWord)) {
      updatedLesson.wordCards = [...currentWordCards, { id: generateId(), text: plainWord, type: 'regular' }];
    }

    onUpdateLesson(updatedLesson);

    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const syllableTiles = useMemo(() => {
    if (!boardText) return [];
    const tiles = parseWordToTiles(boardText);
    const explicit = tiles.filter(t => t.type === 'syllable');
    if (explicit.length > 0) return explicit;

    // Heuristic split for words without explicit syllable markers
    const syllables = splitIntoSyllables(boardText);
    let currentIndex = 0;
    return syllables.map(s => {
      const start = boardText.indexOf(s, currentIndex);
      const tile: TileData = {
        text: s,
        type: 'syllable',
        startIndex: start,
        endIndex: start + s.length
      };
      currentIndex = start + s.length;
      return tile;
    });
  }, [boardText]);

  const MagnetSlot: React.FC<{ text: string, type: TileData['type'], isStack?: boolean, displayOverride?: string }> = ({ text, type, isStack = false, displayOverride }) => {
    const isLearned = allUnlockedItems.includes(text.toLowerCase());
    const displayText = displayOverride || text.replace(/^-/, '').replace(/-$/, '');
    if (!isLearned) return <div className={`flex items-center justify-center rounded-xl md:rounded-2xl border-2 border-dashed border-stone-300/40 bg-stone-100/10 ${isStack ? 'min-w-[3rem] h-12 md:min-w-[4rem] md:h-16' : 'min-w-[2.5rem] h-10 md:min-w-[3rem] md:h-12'}`} />;
    let boardVal = text;
    if (type === 'suffix') boardVal = `<${displayText}>`;
    if (type === 'prefix') boardVal = `${displayText}-`;
    if (type === 'syllable') boardVal = `|${displayText}|`;

    return (
      <button
        onClick={() => handleTileClick(boardVal)}
        className="relative transition-all hover:-translate-y-1 active:scale-95 group"
      >
        {isStack && <div className="absolute -right-1 -bottom-1 md:-right-2 md:-bottom-2 w-full h-full rounded-md border border-stone-400 bg-white/20 -z-10 translate-x-1 translate-y-1" />}
        <Tile data={{ text: displayText, type }} size="md" />
      </button>
    );
  };

  const initCipherPuzzle = useCallback((word: string) => {
    const tiles = parseWordToTiles(word);
    const step = parseInt(lesson.step, 10);
    const substep = parseInt(lesson.substep, 10);

    const getCorrectPhoneme = (grapheme: string, index: number, allTiles: TileData[]) => {
      const g = grapheme.toLowerCase();
      const nextTile = allTiles[index + 1];
      const nextChar = nextTile?.text.toLowerCase()[0];

      if (step >= 7) {
        if (g === 'c' && ['e', 'i', 'y'].includes(nextChar)) return 's';
        if (g === 'g' && ['e', 'i', 'y'].includes(nextChar)) return 'j';
      }

      return getPhonemeForGrapheme(grapheme);
    };

    const cipheredTiles = tiles.map((tile, idx) => {
      const phoneme = getCorrectPhoneme(tile.text, idx, tiles);
      if (phoneme) {
        const options = getOptionsForPhoneme(phoneme, step, substep);
        const isTarget71 = step === 7 && substep === 1 && (tile.text.toLowerCase() === 'c' || tile.text.toLowerCase() === 'g');
        if (options.length > 1 || isTarget71) return { ...tile, isCipher: true, phoneme };
      }
      return { ...tile, isCipher: false };
    });

    // Ensure at least one tile is ciphered
    if (!cipheredTiles.some(t => (t as any).isCipher)) {
       const lastIdx = cipheredTiles.length - 1;
       const phoneme = getPhonemeForGrapheme(cipheredTiles[lastIdx].text) || cipheredTiles[lastIdx].text;
       (cipheredTiles as any)[lastIdx] = { ...cipheredTiles[lastIdx], isCipher: true, phoneme };
    }

    setDisplayTiles(cipheredTiles);
    if (!readOnly) {
      setCipherResults({});
      setCheckResult(null);
    }
    setOpenDropdownIdx(null);
  }, [lesson.step, lesson.substep, readOnly]);

  useEffect(() => {
    if (mode === 'cipher' && cipherWords.length > 0) {
      initCipherPuzzle(cipherWords[activeCipherIdx]);
    }
  }, [mode, activeCipherIdx, cipherWords, initCipherPuzzle]);

  const checkAnswer = () => {
    let allCorrect = true;
    displayTiles.forEach((t, i) => {
      if (t.isCipher && cipherResults[i]?.text !== t.text) allCorrect = false;
    });
    if (allCorrect) {
      setCompletedCipherIndices(prev => new Set(prev).add(activeCipherIdx));
    }
    setCheckResult(allCorrect ? 'correct' : 'incorrect');
  };

  const cipherSyllables = useMemo(() => {
    if (mode !== 'cipher' || !displayTiles.length || !cipherWords[activeCipherIdx]) return [];
    const word = cipherWords[activeCipherIdx];
    const syllables = splitIntoSyllables(word);

    let currentTileIdx = 0;
    return syllables.map(s => {
      const sTiles: (TileData & { isCipher?: boolean, phoneme?: string, originalIdx: number })[] = [];
      let sLength = 0;
      while (currentTileIdx < displayTiles.length && sLength < s.length) {
        const tile = displayTiles[currentTileIdx];
        sTiles.push({ ...tile, originalIdx: currentTileIdx });
        sLength += tile.text.length;
        currentTileIdx++;
      }
      return { text: s, tiles: sTiles };
    });
  }, [mode, displayTiles, activeCipherIdx, cipherWords]);

  const [showLibrary, setShowLibrary] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showCodingTray, setShowCodingTray] = useState(true);
  const runnerMarkIndex = slideIndex ?? 0;
  const runnerMarks = slideMarks?.[runnerMarkIndex] || [];
  const updateRunnerMarks = onUpdateSlideMarks
    ? (nextMarks: CodingMark[]) => onUpdateSlideMarks({ ...(slideMarks || {}), [runnerMarkIndex]: nextMarks })
    : undefined;

  return (
    <div className="min-h-full flex flex-col bg-[#fdf6e3] overflow-hidden select-none text-stone-900 font-sans">
      {/* 1. ULTRA-MINIMAL HEADER */}
      <div className="h-16 border-b-4 border-red-900 flex items-center justify-between px-8 z-40 flex-shrink-0 bg-stone-900 text-white shadow-xl">
        <div className="flex items-center gap-6">
           {!readOnly && <div className="flex bg-stone-800 p-1 rounded-full border border-stone-700">
             {!isSpelling && (hasInteractivePart2 || lesson.slides?.length > 0 || lesson.googleSlidesUrl) && (
                <button
                  onClick={() => setMode('slides')}
                  className={`px-5 py-2 rounded-full transition-all text-xs font-black uppercase tracking-widest ${mode === 'slides' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  {hasInteractivePart2 ? 'Runner' : 'Slides'}
                </button>
             )}
             <button
               onClick={() => setMode('board')}
               className={`px-5 py-2 rounded-full transition-all text-xs font-black uppercase tracking-widest ${mode === 'board' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
             >
               Journal
             </button>
             <button
               onClick={() => setMode('notes')}
               className={`px-5 py-2 rounded-full transition-all text-xs font-black uppercase tracking-widest ${mode === 'notes' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
             >
               Notes
             </button>
           </div>}
        </div>

        <div className="flex items-center gap-4">
           {!readOnly && <button
             onClick={() => setShowCodingTray(!showCodingTray)}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest flex items-center gap-2 border ${showCodingTray ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'}`}
             title="Toggle Coding Marks Tray"
           >
             <Star size={12} className={showCodingTray ? 'fill-current' : ''} />
             {showCodingTray ? 'Marks ON' : 'Marks OFF'}
           </button>}

           <div className="h-4 w-px bg-stone-700" />

           <div className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-300">
             {lesson.title}
           </div>
           <div className="h-4 w-px bg-stone-200" />
           {!readOnly && <button
             onClick={() => setSidebarOpen(!sidebarOpen)}
             className={`p-2.5 rounded-xl transition-all ${sidebarOpen ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-400'}`}
           >
             <LayoutPanelLeft className="w-5 h-5" />
           </button>}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* 2. MAIN WORKSPACE */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {mode === 'slides' && (
            <div className="flex-1 overflow-hidden">
               {interactivePart2Presentation ? (
                 <Part2InteractiveRunner
                   presentation={interactivePart2Presentation}
                   activeStepIndex={slideIndex}
                   onUpdateActiveStepIndex={onUpdateSlideIndex}
                   objectStates={slideObjectStates}
                   onUpdateObjectStates={onUpdateSlideObjectStates}
                   notes={notes}
                   onUpdateNotes={onUpdateNotes}
                   drawingStrokes={drawingStrokes}
                   onUpdateDrawingStrokes={onUpdateDrawingStrokes}
                   drawingTool={tool}
                   onUpdateDrawingTool={setTool}
                   {...(updateRunnerMarks ? { marks: runnerMarks, onUpdateMarks: updateRunnerMarks } : {})}
                   showMarkingTools={showCodingTray}
                   onToggleMarkingTools={() => setShowCodingTray(value => !value)}
                   readOnly={readOnly}
                 />
               ) : (
                 <Slideshow
                   ref={slideshowRef}
                   slides={lesson.slides}
                   googleSlidesUrl={lesson.googleSlidesUrl}
                   tool={tool}
                   currentIndex={slideIndex}
                   onUpdateIndex={onUpdateSlideIndex}
                   drawingStrokes={drawingStrokes}
                   onUpdateDrawingStrokes={onUpdateDrawingStrokes}
                   readOnly={readOnly}
                   slideMarks={slideMarks}
                   onUpdateSlideMarks={onUpdateSlideMarks}
                   objectStates={slideObjectStates}
                   onUpdateObjectStates={onUpdateSlideObjectStates}
                   isFullScreenContent={slideFullScreen}
                   onUpdateFullScreenContent={onUpdateSlideFullScreen}
                 />
               )}
            </div>
          )}
          {mode === 'notes' && <GenericText title="Plan Notes" content={isSpelling ? lesson.conceptNotes7 : lesson.conceptNotes} />}
          {mode === 'board' && (
            <div className="flex-1 flex flex-col min-h-0 relative">
               <div className="flex-1 flex flex-col relative min-h-0">
                  <div ref={boardDisplayRef} className="flex-1 flex items-center justify-center p-12 min-h-0 relative">
                     <canvas
                       ref={syncedDrawing.canvasRef}
                       onPointerDown={syncedDrawing.onPointerDown}
                       onPointerMove={syncedDrawing.onPointerMove}
                       onPointerUp={syncedDrawing.onPointerUp}
                       onPointerCancel={syncedDrawing.onPointerCancel}
                       className={`absolute inset-0 z-20 touch-none ${readOnly || tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
                     />

                     {showSaveSuccess && (
                       <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="font-bold uppercase text-xs tracking-widest">Added to Slides</span>
                       </div>
                     )}

                     <div className="absolute inset-0 z-40 pointer-events-none">
                       {visibleMarks.map(mark => (
                         <Draggable
                           key={mark.id}
                           initialPos={{ x: mark.x, y: mark.y }}
                           onDragEnd={(pos) => !readOnly && updateMark(mark.id, pos)}
                           className={readOnly ? 'pointer-events-none' : 'pointer-events-auto'}
                         >
                            <div className="relative group/mark flex items-center justify-center transition-all hover:scale-110 active:scale-125 cursor-grab active:cursor-grabbing p-4">
                               <CodingMarkContent mark={mark} variant="small" />
                               {!readOnly && <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setMarks(prev => prev.filter((m: CodingMark) => m && m.id !== mark.id));
                                 }}
                                 className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/mark:opacity-100 transition-opacity z-50"
                               >
                                 <X size={12} />
                               </button>}
                            </div>
                         </Draggable>
                       ))}
                     </div>

                     <div className="w-full max-w-6xl z-0 relative flex flex-col items-center">
                        <div className="w-full h-px bg-stone-200 mb-20" /> {/* Horizontal alignment line */}

                        <div className="journal-content w-full flex items-center justify-center">
                          {boardText.length === 0 ? (
                            <div className="flex flex-col items-center gap-8 opacity-20">
                              <ScrollText className="w-24 h-24 text-stone-300" />
                              <p className="text-xl font-medium text-stone-400 tracking-wide">Select tiles to build a word</p>
                            </div>
                          ) : isSyllabicated ? (
                            <div className="flex items-center justify-center gap-1 bg-stone-100/50 p-2 rounded-3xl">
                               {syllableTiles.map((t, i) => (
                                 <div key={i} className="relative transition-transform hover:-translate-y-1 group/tile">
                                    <Tile data={t} size="xl" />
                                    <input
                                       type="text"
                                       value={t.text}
                                       onChange={(e) => handleTileTextEdit(t, e.target.value)}
                                       className="absolute inset-0 w-full h-full text-5xl font-black text-stone-900 tracking-tight bg-transparent border-none outline-none text-center z-10 opacity-0 focus:opacity-100"
                                    />
                                    {/* Visible text proxy to allow Tile to size correctly while input handles edits */}
                                    <div className="hidden">
                                       <Tile data={t} size="xl" />
                                    </div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="flex items-end justify-center gap-1 flex-wrap">
                              {parseWordToTiles(boardText).map((t, i) => (
                                <div key={i} className="relative group/tile transition-transform hover:-translate-y-1">
                                   {t.type === 'space' ? (
                                      <div className="w-12 h-12" />
                                   ) : (
                                      <div className="relative">
                                         <Tile data={t} size="lg" />
                                         <input
                                            type="text"
                                            value={t.text}
                                            onChange={(e) => handleTileTextEdit(t, e.target.value)}
                                            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none font-black text-stone-900 text-center text-4xl z-10 opacity-0 focus:opacity-100"
                                         />
                                      </div>
                                   )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="w-full h-px bg-stone-200 mt-20" />
                     </div>

                     {/* QUICK WORD ENTRY BAR */}
                     <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-6">
                       <div className="bg-white/80 backdrop-blur-xl border-2 border-stone-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl p-2 flex items-center gap-2 group focus-within:border-stone-900 focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-all">
                         <div className="p-3 bg-stone-100 rounded-2xl text-stone-400 group-focus-within:text-stone-900 transition-colors">
                           <TypeIcon size={20} />
                         </div>
                         <input
                           type="text"
                           value={boardText}
                           onChange={(e) => setBoardText(e.target.value)}
                           className="flex-1 bg-transparent border-none outline-none text-2xl font-black text-stone-900 placeholder:text-stone-300 px-2"
                           placeholder="Type to build word..."
                         />
                         <button
                           onClick={clearBoard}
                           className={`p-3 rounded-2xl transition-all ${boardText ? 'text-stone-400 hover:text-red-500 hover:bg-red-50' : 'text-stone-200 pointer-events-none'}`}
                           title="Clear Board"
                         >
                           <Eraser size={20} />
                         </button>
                       </div>
                     </div>
                  </div>
               </div>

               {/* TILES LIBRARY (Now styled like your reference) */}
               {showLibrary && (
                 <div className="h-[40%] bg-stone-50 border-t border-stone-200 p-8 overflow-y-auto z-10 shrink-0">
                    <div className="max-w-7xl mx-auto space-y-10 pb-20">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-200 pb-2">Single Letters</h4>
                             {PHYSICAL_JOURNAL_MAP.alphabet.map((row, rIdx) => (
                               <div key={rIdx} className="flex gap-2 flex-wrap">{row.map(char => (<MagnetSlot key={char} text={char} type={['a','e','i','o','u','y'].includes(char) ? 'vowel' : 'consonant'} />))}</div>
                             ))}
                          </div>

                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-200 pb-2">Digraphs & Blends</h4>
                             <div className="flex gap-2 flex-wrap">{PHYSICAL_JOURNAL_MAP.digraphs.map(d => <MagnetSlot key={d} text={d} type="consonant" />)}</div>
                          </div>

                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-200 pb-2">Welded Sounds / Suffixes</h4>
                             <div className="flex flex-col gap-4">
                                <div className="flex gap-2 flex-wrap">{PHYSICAL_JOURNAL_MAP.welded.standard.map(w => <MagnetSlot key={w} text={w} type="welded" />)}</div>
                                <div className="flex gap-2 flex-wrap">{PHYSICAL_JOURNAL_MAP.commonAffixes.suffixes.map(s => <MagnetSlot key={s} text={s} type="suffix" />)}</div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* 3. FLOATING TOOL PALETTE (Top Left) */}
          {(mode === 'board' || (mode === 'slides' && !hasInteractivePart2)) && !readOnly && (
             <div className="absolute top-6 left-6 z-50 flex flex-col items-center gap-1.5 bg-white/60 backdrop-blur-md border border-stone-200/50 p-1.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all hover:bg-white/90 group/tray">
                <button
                  onClick={() => setTool('cursor')}
                  className={`p-3 rounded-xl transition-all ${tool === 'cursor' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:text-stone-900'}`}
                  title="Cursor"
                >
                   <MousePointer2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTool('pen')}
                  className={`p-3 rounded-xl transition-all ${tool === 'pen' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:text-stone-900'}`}
                  title="Draw/Mark"
                >
                   <PenTool className="w-4 h-4" />
                </button>

                {showCodingTray && (
                  <>
                    <div className="w-8 h-px bg-black/5 my-1" />
                    <CodingTray onSpawnMark={spawnMark} onClearMarks={clearMarks} vertical initiallyCollapsed />
                  </>
                )}

                <div className="w-8 h-px bg-black/5 my-1" />

                <button
                  onClick={clearCanvas}
                  className="p-3 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Clear Writing"
                >
                   <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={clearMarks}
                  className="p-3 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Clear Marks"
                >
                   <Trash2 className="w-4 h-4" />
                </button>
             </div>
          )}
        </div>

        {/* 4. SIDEBAR PANEL (Drawer Style) */}
        <div className={`fixed top-16 right-0 bottom-0 bg-white border-l border-stone-200 transition-transform duration-500 z-30 shadow-2xl flex flex-col ${sidebarOpen ? 'translate-x-0 w-[400px]' : 'translate-x-full w-[400px]'}`}>
           <div className="flex-1 overflow-y-auto p-10 space-y-12">
             <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">Journal Options</h3>
                <div className="flex flex-col gap-3">
                   <button
                     onClick={() => setIsSyllabicated(!isSyllabicated)}
                     className={`w-full py-4 px-5 rounded-2xl text-left font-bold text-sm transition-all border ${isSyllabicated ? 'bg-red-50 border-red-100 text-red-900' : 'bg-stone-50 border-stone-100 text-stone-500 hover:bg-stone-100'}`}
                   >
                      <div className="flex items-center justify-between">
                         <span>Guided Syllable View</span>
                         <div className={`w-8 h-4 rounded-full relative transition-colors ${isSyllabicated ? 'bg-red-600' : 'bg-stone-300'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isSyllabicated ? 'left-4.5' : 'left-0.5'}`} />
                         </div>
                      </div>
                   </button>
                   <button
                     onClick={() => setShowLibrary(!showLibrary)}
                     className={`w-full py-4 px-5 rounded-2xl text-left font-bold text-sm transition-all border ${showLibrary ? 'bg-stone-900 text-white border-stone-900 shadow-xl' : 'bg-stone-50 border-stone-100 text-stone-500'}`}
                   >
                      <div className="flex items-center justify-between">
                         <span>Phonetic Tile Library</span>
                         {showLibrary ? <Minus size={16} /> : <Plus size={16} />}
                      </div>
                   </button>
                </div>
             </div>

             {mode === 'board' && (
                <div className="space-y-8 pt-8 border-t border-stone-100">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 ml-1">Composition</label>
                      <div className="relative">
                         <input
                           ref={inputRef}
                           type="text"
                           value={boardText}
                           onChange={(e) => setBoardText(e.target.value)}
                           className="w-full bg-stone-50 border border-stone-200 p-5 rounded-2xl text-xl font-bold focus:ring-4 ring-stone-900/5 outline-none pr-14"
                           placeholder="Enter text..."
                         />
                         <button onClick={backspace} className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-red-500"><Delete size={18} /></button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">Convert to Slide</h3>
                      <div className="space-y-4">
                         <input
                           type="text"
                           value={boardTitle}
                           onChange={(e) => setBoardTitle(e.target.value)}
                           className="w-full bg-stone-50 border border-stone-200 p-4 text-sm rounded-xl outline-none focus:ring-4 ring-stone-900/5"
                           placeholder="Title (Optional)"
                         />
                         <textarea
                           value={boardNotes}
                           onChange={(e) => setBoardNotes(e.target.value)}
                           className="w-full bg-stone-50 border border-stone-200 p-4 text-xs rounded-xl h-32 outline-none focus:ring-4 ring-stone-900/5 resize-none"
                           placeholder="Sensei Notes..."
                         />
                         <button
                           onClick={handleSaveAsSlide}
                           disabled={!boardText.trim()}
                           className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_20px_40px_rgba(0,0,0,0.2)] active:scale-95 transition-all disabled:opacity-10"
                         >
                            Add to Presentation
                         </button>
                      </div>
                   </div>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default TeachConcepts;
