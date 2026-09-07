import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DictationSection, Lesson } from '../../types';
import {
  Play, Settings, Eye, EyeOff, CheckCircle2, RotateCcw, Turtle, Volume2,
  Ear, Book, Layers, HelpCircle, AlignLeft, FileText, PenTool,
  MousePointer2, Trash2, Gamepad2, X, Check, ArrowDown, Sparkles,
  Scroll, CloudSun, Plane, Flower, Bug, ChevronLeft, ChevronRight,
  Star, CheckCircle, Columns
} from 'lucide-react';
import { parseWordToTiles, TileData, generateId, splitIntoSyllables } from '../../utils';
import { getPhonemeForGrapheme, getOptionsForPhoneme } from '../../masterCurriculum';
import Tile from '../Tile';
import CodingTray, { CodingMark } from './CodingTray';
import Draggable from '../interactive/Draggable';
import { useSyncState } from '../../hooks/useSyncState';
import CodingMarkContent from '../CodingMarkContent';
import HandwritingGrid from '../HandwritingGrid';
import { DrawingStroke, useSyncedDrawingCanvas } from '../../drawingSync';

interface SpellingProps {
  data: DictationSection;
  lessonStep?: string;
  lessonSubstep?: string;
  // Sync props
  viewMode?: 'list' | 'cipher' | 'grid';
  onUpdateViewMode?: (mode: 'list' | 'cipher' | 'grid') => void;
  activeTab?: number;
  onUpdateActiveTab?: (tab: number) => void;
  revealedItems?: Record<string, boolean>;
  onUpdateRevealedItems?: (items: Record<string, boolean>) => void;
  cipherWord?: string | null;
  onUpdateCipherWord?: (word: string | null) => void;
  gridPage?: 1 | 2;
  onUpdateGridPage?: (page: 1 | 2) => void;
  isSyllabicated?: boolean;
  onUpdateSyllabicated?: (val: boolean) => void;
  marks?: CodingMark[];
  onUpdateMarks?: (marks: CodingMark[]) => void;
  drawingStrokes?: DrawingStroke[];
  onUpdateDrawingStrokes?: (strokes: DrawingStroke[]) => void;
  readOnly?: boolean;
  cipherResults?: Record<number, TileData>;
  onUpdateCipherResults?: (results: Record<number, TileData>) => void;
  cipherCheckResult?: 'correct' | 'incorrect' | null;
  onUpdateCipherCheckResult?: (result: 'correct' | 'incorrect' | null) => void;
}

const Spelling: React.FC<SpellingProps> = ({
  data,
  lessonStep = "1",
  lessonSubstep = "1",
  viewMode: syncedViewMode,
  onUpdateViewMode,
  activeTab: syncedActiveTab,
  onUpdateActiveTab,
  revealedItems: syncedRevealedItems,
  onUpdateRevealedItems,
  cipherWord: syncedCipherWord,
  onUpdateCipherWord,
  gridPage: syncedGridPage,
  onUpdateGridPage,
  isSyllabicated: syncedSyllabicated,
  onUpdateSyllabicated,
  marks: syncedMarks,
  onUpdateMarks,
  drawingStrokes,
  onUpdateDrawingStrokes,
  readOnly = false,
  cipherResults: syncedCipherResults,
  onUpdateCipherResults,
  cipherCheckResult: syncedCipherCheckResult,
  onUpdateCipherCheckResult
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [isSlow, setIsSlow] = useState(false);

  const [activeTab, setActiveTab] = useSyncState(syncedActiveTab, onUpdateActiveTab, 0);
  const [viewMode, setViewMode] = useSyncState(syncedViewMode, onUpdateViewMode, 'list' as 'list' | 'cipher' | 'grid');
  const [gridPage, setGridPage] = useSyncState(syncedGridPage, onUpdateGridPage, 1 as 1 | 2);
  const [marks, setMarks] = useSyncState(syncedMarks, onUpdateMarks, [] as CodingMark[]);
  const [revealedItems, setRevealedItems] = useSyncState(syncedRevealedItems, onUpdateRevealedItems, {} as Record<string, boolean>);
  const [isSyllabicated, setIsSyllabicated] = useSyncState(syncedSyllabicated, onUpdateSyllabicated, false);
  const [cipherWord, setCipherWord] = useSyncState(syncedCipherWord, onUpdateCipherWord, null as string | null);

  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('cursor');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const syncedDrawing = useSyncedDrawingCanvas({
    strokes: drawingStrokes,
    onUpdateStrokes: onUpdateDrawingStrokes,
    tool,
    lineWidth: 3.5,
    readOnly
  });

  const CIPHER_WORDS_71 = ['decent', 'giant', 'suggest', 'place', 'stingy', 'engage', 'fancy'];
  const [displayTiles, setDisplayTiles] = useState<(TileData & { isCipher?: boolean, phoneme?: string })[]>([]);
  const [cipherResults, setCipherResults] = useSyncState(syncedCipherResults, onUpdateCipherResults, {} as Record<number, TileData>);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [checkResult, setCheckResult] = useSyncState(syncedCipherCheckResult, onUpdateCipherCheckResult, null as 'correct' | 'incorrect' | null);

  const cipherSyllables = useMemo(() => {
    if (viewMode !== 'cipher' || !displayTiles.length || !cipherWord) return [];
    const syllables = splitIntoSyllables(cipherWord);

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
  }, [viewMode, displayTiles, cipherWord]);

  const sections = [
    { title: "Sounds", data: data.sounds || [], icon: Ear },
    { title: "Real Words", data: data.realWords || [], icon: Book },
    { title: "Word Elements", data: data.wordElements || [], icon: Layers },
    { title: "Nonsense Words", data: data.nonsenseWords || [], icon: HelpCircle },
    { title: "Phrases", data: data.phrases || [], icon: AlignLeft },
    { title: "Sentences", data: data.sentences || [], icon: FileText },
    { title: "Cipher Mission", data: CIPHER_WORDS_71, icon: Gamepad2 }
  ];

  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
      if (!selectedVoiceURI && vs.length > 0) {
        const best = vs.find(v => v.name.includes('Google US English')) || vs[0];
        if (best) setSelectedVoiceURI(best.voiceURI);
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const setupCanvas = () => {
    if (containerRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

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

  useEffect(() => {
    window.addEventListener('resize', setupCanvas);
    setupCanvas();
    return () => window.removeEventListener('resize', setupCanvas);
  }, [activeTab, viewMode, gridPage]);

  const speakWord = (text: string) => {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[/\\{}[\]-]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (voice) utterance.voice = voice;
    utterance.rate = isSlow ? 0.5 : 0.9;
    window.speechSynthesis.speak(utterance);
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
    ctx.lineWidth = 3.5;
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

  const spawnMark = (type: CodingMark['type']) => {
    if (!containerRef.current) return;
    const newMark: CodingMark = {
      id: generateId(),
      type,
      x: containerRef.current.clientWidth / 2 - 50,
      y: containerRef.current.clientHeight / 2 - 50,
      scale: 1.5
    };
    setMarks(prev => [...prev, newMark]);
  };

  const updateMark = (id: string, updates: Partial<CodingMark>) => {
    setMarks((prev: CodingMark[]) => prev.filter(Boolean).map((m: CodingMark) => m.id === id ? { ...m, ...updates } : m));
  };

  const visibleMarks = (marks || []).filter((mark): mark is CodingMark => Boolean(mark?.id));

  const initCipherGame = (word: string) => {
    setCipherWord(word);
    const tiles = parseWordToTiles(word);
    const step = parseInt(lessonStep, 10);
    const substep = parseInt(lessonSubstep, 10);

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

    if (!cipheredTiles.some(t => (t as any).isCipher)) {
       const lastIdx = cipheredTiles.length - 1;
       const phoneme = getPhonemeForGrapheme(cipheredTiles[lastIdx].text) || cipheredTiles[lastIdx].text;
       (cipheredTiles as any)[lastIdx] = { ...cipheredTiles[lastIdx], isCipher: true, phoneme };
    }

    setDisplayTiles(cipheredTiles);
    setCipherResults({});
    setCheckResult(null);
    setOpenDropdownIdx(null);
    setViewMode('cipher');
  };

  useEffect(() => {
    if (!cipherWord) {
      setDisplayTiles([]);
      return;
    }
    const tiles = parseWordToTiles(cipherWord);
    const step = parseInt(lessonStep, 10);
    const substep = parseInt(lessonSubstep, 10);
    const cipheredTiles = tiles.map((tile, index) => {
      const grapheme = tile.text.toLowerCase();
      const nextCharacter = tiles[index + 1]?.text.toLowerCase()[0];
      const phoneme = (step >= 7 && grapheme === 'c' && ['e', 'i', 'y'].includes(nextCharacter || '')
        ? 's'
        : step >= 7 && grapheme === 'g' && ['e', 'i', 'y'].includes(nextCharacter || '')
          ? 'j'
          : getPhonemeForGrapheme(tile.text)) || undefined;
      const options = phoneme ? getOptionsForPhoneme(phoneme, step, substep) : [];
      const target71 = step === 7 && substep === 1 && (grapheme === 'c' || grapheme === 'g');
      return options.length > 1 || target71 ? { ...tile, isCipher: true, phoneme } : { ...tile, isCipher: false };
    });
    if (!cipheredTiles.some(tile => tile.isCipher) && cipheredTiles.length) {
      const lastIndex = cipheredTiles.length - 1;
      const phoneme = getPhonemeForGrapheme(cipheredTiles[lastIndex].text) || cipheredTiles[lastIndex].text;
      cipheredTiles[lastIndex] = { ...cipheredTiles[lastIndex], isCipher: true, phoneme };
    }
    setDisplayTiles(cipheredTiles);
  }, [cipherWord, lessonStep, lessonSubstep]);

  const checkAnswer = () => {
    let allCorrect = true;
    displayTiles.forEach((t, i) => {
      if (t.isCipher && cipherResults[i]?.text !== t.text) allCorrect = false;
    });
    setCheckResult(allCorrect ? 'correct' : 'incorrect');
  };

  const currentSection = sections[activeTab];
  const SectionIcon = currentSection.icon;
  const nextUnrevealedIndex = currentSection.data.findIndex((_, idx) => !revealedItems[`${activeTab}-${idx}`]);
  const nextDictationItem = nextUnrevealedIndex >= 0 ? currentSection.data[nextUnrevealedIndex] : null;

  const getSoundRevealText = (text: string) => {
    const step = parseInt(lessonStep, 10);
    const substep = parseInt(lessonSubstep, 10);
    const options = getOptionsForPhoneme(text, step, substep);
    if (options.length === 0) return text;
    return `${text} = ${options.join(', ')}`;
  };

  const [showCodingTray, setShowCodingTray] = useState(true);

  return (
    <div className="min-h-full flex flex-col bg-[#fdf6e3] font-sans overflow-hidden text-stone-900">
      <div className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between px-8 py-4 bg-stone-900 border-b-4 border-red-900 shadow-md z-30 text-[#fdf6e3]">
        <div className="flex items-center gap-6">
          <div className="p-2 bg-red-900 rounded-lg shadow-xl"><CheckCircle2 className="w-6 h-6 text-white" /></div>
          <div>
            <h2 className="text-2xl font-bold font-serif uppercase tracking-widest leading-none">Written Work</h2>
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] mt-1">Wilson Reading Protocol</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
           {!readOnly && <div className="flex bg-stone-800 p-1 rounded-2xl border border-stone-700 shadow-inner">
             <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${viewMode === 'list' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-white'}`}>List</button>
             <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${viewMode === 'grid' ? 'bg-red-800 text-white' : 'text-stone-500 hover:text-white'}`}>Dictation</button>
             <button onClick={() => { setViewMode('cipher'); setCipherWord(null); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${viewMode === 'cipher' ? 'bg-purple-900 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-stone-500 hover:text-white'}`}>Cipher</button>
           </div>}

           <div className="w-px h-8 bg-stone-700 mx-1" />

           {!readOnly && <button
             onClick={() => setIsSyllabicated(!isSyllabicated)}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest flex items-center gap-2 border ${isSyllabicated ? 'bg-amber-100 text-amber-900 border-amber-200 shadow-sm' : 'bg-stone-800 text-stone-500 border-stone-700 hover:text-white'}`}
             title="Toggle Syllable Cards"
           >
             <Columns className="w-3.5 h-3.5" />
             {isSyllabicated ? 'Syllables ON' : 'Syllables OFF'}
           </button>}

           <div className="w-px h-8 bg-stone-700 mx-1" />

           {!readOnly && <button
             onClick={() => setShowCodingTray(!showCodingTray)}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest flex items-center gap-2 border ${showCodingTray ? 'bg-emerald-100 text-emerald-900 border-emerald-200 shadow-sm' : 'bg-stone-800 text-stone-500 border-stone-700 hover:text-white'}`}
             title="Toggle Coding Marks Toolbar"
           >
             <Star className={`w-3.5 h-3.5 ${showCodingTray ? 'fill-current' : ''}`} />
             {showCodingTray ? 'Marks ON' : 'Marks OFF'}
           </button>}

           <div className="w-px h-8 bg-stone-700 mx-1" />

           {!readOnly && <div className="flex bg-stone-800 p-1 rounded-lg gap-1 border border-stone-600">
             <button onClick={() => setTool('cursor')} className={`p-2 rounded ${tool === 'cursor' ? 'bg-[#fdf6e3] text-stone-900 shadow-lg' : 'text-stone-400 hover:text-white'}`} title="Cursor"><MousePointer2 className="w-4 h-4" /></button>
             <button onClick={() => setTool('pen-blue')} className={`p-2 rounded ${tool === 'pen-blue' ? 'bg-indigo-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`} title="Marking Ink"><PenTool className="w-4 h-4" /></button>
             <button onClick={() => setTool('pen-red')} className={`p-2 rounded ${tool === 'pen-red' ? 'bg-red-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`} title="Correction Ink"><PenTool className="w-4 h-4" /></button>
             <div className="w-px h-6 bg-stone-600 mx-1 self-center" />
             <button onClick={clearCanvas} className="p-2 rounded text-stone-400 hover:text-white hover:bg-red-900 transition-colors" title="Clear Ink"><Trash2 className="w-4 h-4" /></button>
           </div>}
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="flex-shrink-0 bg-white/50 backdrop-blur-sm px-4 overflow-x-auto scrollbar-hide border-b border-stone-100">
          <div className="flex gap-1 min-w-max mx-auto max-w-5xl">
            {sections.map((sec, idx) => (
              <button
                key={idx}
                onClick={!readOnly ? () => setActiveTab(idx) : undefined}
                className={`flex items-center gap-2 px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === idx ? 'border-red-800 bg-white text-stone-900 shadow-sm' : 'border-transparent text-stone-300'} ${readOnly ? 'cursor-default' : 'hover:text-stone-900'}`}
              >
                <sec.icon className="w-3 h-3" />
                {sec.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {!readOnly && viewMode !== 'cipher' && nextDictationItem && (
        <div data-testid="teacher-dictation-cue" className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-3 shadow-sm z-20">
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <div className="rounded-full bg-amber-900 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">Teacher only</div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-700">Dictate next • {currentSection.title}</div>
              <div className="truncate text-2xl font-black font-serif text-stone-900">{nextDictationItem}</div>
            </div>
            <button
              onClick={() => setRevealedItems(prev => ({ ...prev, [`${activeTab}-${nextUnrevealedIndex}`]: true }))}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-amber-900 shadow-sm hover:bg-amber-100"
            >
              {viewMode === 'list' ? 'Reveal & next' : 'Done & next'}
            </button>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto p-8 relative flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] pb-24">
        {(viewMode === 'grid' || viewMode === 'cipher') && showCodingTray && !readOnly && (
           <div className="absolute top-4 left-6 z-50">
              <CodingTray onSpawnMark={spawnMark} onClearMarks={() => setMarks([])} initiallyCollapsed={true} />
           </div>
        )}

        {viewMode === 'list' && (
          <div className="max-w-5xl w-full relative z-10 animate-in fade-in duration-500">
            <div className="mb-6 flex items-center justify-between bg-white px-6 py-8 rounded-[2rem] border border-stone-100 shadow-sm">
               <div className="flex items-center gap-3 md:gap-5">
                  <div className="p-3 md:p-4 bg-stone-900 rounded-2xl text-white shadow-lg"><SectionIcon className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div>
                     <h3 className="text-2xl md:text-3xl font-serif font-black text-stone-900 italic">{currentSection.title}</h3>
                     <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-stone-300">Registry Data • Mission Dictation</p>
                  </div>
               </div>
               {!readOnly && <button
                 onClick={() => {
                   const allRevealed = currentSection.data.every((_, i) => revealedItems[`${activeTab}-${i}`]);
                   const next = { ...revealedItems };
                   currentSection.data.forEach((_, i) => next[`${activeTab}-${i}`] = !allRevealed);
                   setRevealedItems(next);
                 }}
                 className="px-6 py-3 bg-white border border-stone-100 text-stone-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-stone-900 hover:border-stone-200 transition-all flex items-center gap-2 shadow-sm"
               >
                 {currentSection.data.every((_, i) => revealedItems[`${activeTab}-${i}`]) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                 {currentSection.data.every((_, i) => revealedItems[`${activeTab}-${i}`]) ? 'Hide All' : 'Reveal All'}
               </button>}
            </div>
            <div className="space-y-3">
              {currentSection.data.map((text, idx) => (
                <div
                  key={idx}
                  className={`flex items-center p-6 rounded-2xl border transition-all ${
                    !revealedItems[`${activeTab}-${idx}`]
                      ? `bg-stone-50/50 border-stone-100 border-dashed ${readOnly ? '' : 'cursor-pointer hover:bg-white hover:border-stone-200'}`
                      : 'bg-white border-stone-100 hover:border-red-800/20 hover:shadow-xl'
                  } group`}
                  onClick={!readOnly ? () => {
                    setRevealedItems(prev => ({ ...prev, [`${activeTab}-${idx}`]: !prev[`${activeTab}-${idx}`] }));
                  } : undefined}
                >
                  {!readOnly && <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(text);
                    }}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-800 text-white hover:bg-red-900 flex items-center justify-center mr-4 md:mr-8 shadow-md transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                  </button>}

                  {revealedItems[`${activeTab}-${idx}`] ? (
                    <div className="flex-1 animate-in fade-in slide-in-from-left-4 duration-300">
                      {isSyllabicated && activeTab !== 0 && activeTab !== 5 && activeTab !== 4 ? (
                        <div className="flex flex-wrap gap-2 md:gap-4">
                          {splitIntoSyllables(text).map((syllable, sIdx) => (
                            <div key={sIdx} className="transition-transform hover:-translate-y-1">
                               <Tile data={{ text: syllable, type: 'syllable' }} size="md" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-2xl md:text-4xl font-bold text-stone-900 tracking-tight">
                          {activeTab === 0 ? getSoundRevealText(text) : text}
                        </span>
                      )}
                    </div>
                  ) : !readOnly ? (
                    <div className="flex flex-1 items-center gap-4">
                      <div className="rounded-lg bg-amber-100 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-amber-800">Teacher cue</div>
                      <span className="text-xl md:text-2xl font-black font-serif text-stone-700">{text}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-stone-200">
                      <HelpCircle className="w-8 h-8 opacity-40" />
                      <span className="text-xl font-serif italic opacity-40">Waiting for teacher...</span>
                    </div>
                  )}

                  {!readOnly && activeTab !== 0 && (
                    <button onClick={(e) => { e.stopPropagation(); initCipherGame(text); }} className="ml-auto opacity-0 group-hover:opacity-100 bg-white border border-stone-100 text-stone-300 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all hover:text-stone-900 hover:border-stone-200 flex items-center gap-2">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {activeTab === 6 ? 'Start' : 'Cipher'}
                    </button>
                  )}
                </div>
              ))}
              {currentSection.data.length === 0 && (
                <div className="p-20 border-4 border-dashed border-stone-300 rounded-[3rem] text-center">
                   <X className="text-stone-200 w-16 h-16 mx-auto mb-4" />
                   <p className="font-black uppercase tracking-widest text-stone-400 text-sm">No items in this section</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'grid' && (
           <div className="w-full max-w-5xl relative z-10 animate-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white p-12 md:p-16 rounded-[2.5rem] border border-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] min-h-[100vh] flex flex-col relative overflow-hidden">
                 <div className="flex justify-between items-end border-b-2 border-stone-900 pb-8 mb-12">
                    <div>
                      <h1 className="text-5xl font-black uppercase tracking-tighter text-stone-900 italic">Dictation Page</h1>
                      <div className="flex items-center gap-6 mt-2 text-stone-300 text-[10px] font-black uppercase tracking-[0.2em]">
                         <span>WRS Handwriting Grids</span>
                         <span className="text-red-800">●</span>
                         <span>Step {lessonStep}.{lessonSubstep}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="block text-stone-200 font-black uppercase text-[8px] tracking-[0.4em] mb-3">Dojo Scroll Page</span>
                       <div className="flex gap-2">
                          <button onClick={!readOnly ? () => setGridPage(1) : undefined} className={`w-10 h-10 rounded-2xl font-black flex items-center justify-center border transition-all ${gridPage === 1 ? 'bg-stone-900 text-white border-stone-900 shadow-lg' : 'bg-white text-stone-300 border-stone-100 hover:border-stone-400'}`}>1</button>
                          <button onClick={!readOnly ? () => setGridPage(2) : undefined} className={`w-10 h-10 rounded-2xl font-black flex items-center justify-center border transition-all ${gridPage === 2 ? 'bg-stone-900 text-white border-stone-900 shadow-lg' : 'bg-white text-stone-300 border-stone-100 hover:border-stone-400'}`}>2</button>
                       </div>
                    </div>
                 </div>

                 {gridPage === 1 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-16 animate-in fade-in duration-500">
                       <section>
                          <h3 className="text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] mb-6 flex items-center gap-2 border-l-4 border-red-800 pl-4">► Sounds</h3>
                          <HandwritingGrid rows={5} />
                       </section>
                       <section>
                          <h3 className="text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] mb-6 flex items-center gap-2 border-l-4 border-red-800 pl-4">► Word Elements</h3>
                          <HandwritingGrid rows={5} />
                       </section>
                       <section>
                          <h3 className="text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] mb-6 flex items-center gap-2 border-l-4 border-red-800 pl-4">► Real Words</h3>
                          <HandwritingGrid rows={5} />
                       </section>
                       <section>
                          <h3 className="text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] mb-6 flex items-center gap-2 border-l-4 border-red-800 pl-4">► Nonsense Words</h3>
                          <HandwritingGrid rows={5} />
                       </section>
                    </div>
                 ) : (
                    <div className="flex flex-col gap-16 animate-in fade-in duration-500">
                       <section>
                          <h3 className="text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] mb-8 flex items-center gap-2 border-l-4 border-red-800 pl-4">► Phrases</h3>
                          <HandwritingGrid rows={3} />
                       </section>
                       <section>
                          <h3 className="text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] mb-8 flex items-center gap-2 border-l-4 border-red-800 pl-4">► Sentences</h3>
                          <HandwritingGrid rows={3} />
                       </section>
                    </div>
                 )}

                 <div className="absolute bottom-10 right-10 opacity-5 pointer-events-none">
                    <span className="text-9xl font-black font-serif">道</span>
                 </div>
              </div>
           </div>
        )}

        {viewMode === 'cipher' && (
          <div className="max-w-4xl w-full z-10 flex flex-col items-center justify-center flex-1">
            {!cipherWord ? (
              <div className="text-center bg-white/40 backdrop-blur-md p-16 rounded-[4rem] border-4 border-dashed border-stone-300 animate-pulse">
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <Gamepad2 className="w-full h-full text-stone-300" />
                  <Sparkles className="absolute -top-4 -right-4 w-10 h-10 text-purple-400" />
                </div>
                <p className="font-serif italic text-stone-400 text-3xl text-center">Select a word to start the Phonetic Cipher...</p>
                {!readOnly && <button onClick={() => setViewMode('list')} className="mt-8 text-stone-400 font-black uppercase text-xs tracking-widest hover:text-red-800 transition-colors">&larr; Return to Master List</button>}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-16 py-12 animate-in zoom-in-95 duration-500">
                 <div className="text-center space-y-2 relative group">
                    <h3 className="text-stone-400 font-black uppercase tracking-[0.4em] text-xs">Mission Cipher Objective</h3>
                    <h4 className="text-5xl font-black font-serif text-stone-900">Spelling for /{displayTiles.find(t => t.isCipher)?.phoneme}/</h4>

                    {!readOnly && <div className="absolute -right-12 top-0 flex flex-col gap-2">
                       <button
                          onClick={() => setIsSyllabicated(!isSyllabicated)}
                          className={`p-3 rounded-xl border-2 transition-all shadow-sm ${isSyllabicated ? 'bg-red-800 border-red-900 text-white shadow-red-900/20' : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'}`}
                          title={isSyllabicated ? "Show Individual Tiles" : "Show Syllable Cards"}
                       >
                          <Columns className="w-5 h-5" />
                       </button>
                    </div>}
                 </div>

                  <div className={`flex flex-wrap ${isSyllabicated ? 'items-stretch' : 'items-end'} justify-center gap-4`}>
                    {isSyllabicated ? (
                      <div className="grid grid-flow-col auto-cols-auto justify-center gap-6 w-full">
                        {cipherSyllables.map((syllable, sIdx) => (
                          <div key={sIdx} className="bg-white border-x border-t border-b-4 border-stone-200 rounded-xl px-4 py-3 md:px-8 md:py-6 shadow-xl flex items-end justify-center min-w-[6rem] md:min-w-[8rem] relative group/card transition-transform hover:-translate-y-1">
                            <div className="flex items-end justify-center gap-1 relative z-10">
                              {syllable.tiles.map((tile) => {
                                const idx = tile.originalIdx;
                                return (
                                  <div key={idx} className="relative flex flex-col items-center">
                                    {tile.isCipher ? (
                                      <div className="flex flex-col items-center">
                                        <div className="mb-2 px-3 py-1 bg-white border-2 border-purple-200 rounded-full shadow-sm animate-bounce">
                                          <span className="text-xl font-bold text-purple-600">/{tile.phoneme}/</span>
                                        </div>
                                        <div className="relative">
                                          <button
                                            onClick={!readOnly ? () => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx) : undefined}
                                            className={`relative min-w-[5rem] h-20 rounded-xl border-x border-t border-b-4 flex flex-col items-center justify-center transition-all group/slot
                                              ${checkResult === 'correct' ? 'border-emerald-500 bg-emerald-50 shadow-lg' :
                                                checkResult === 'incorrect' ? 'border-red-500 bg-red-50' :
                                                cipherResults[idx] ? 'border-purple-500 bg-purple-50 shadow-lg scale-105' :
                                                openDropdownIdx === idx ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-200' :
                                                'border-dashed border-stone-300 bg-white/10 hover:border-stone-400'}`}
                                          >
                                             {cipherResults[idx] ? (
                                               <div className="scale-110 animate-in zoom-in duration-300">
                                                 <Tile data={cipherResults[idx]} size="xl" />
                                               </div>
                                             ) : (
                                               <div className="w-8 h-1 bg-stone-200 rounded-full" />
                                             )}
                                             {checkResult === 'correct' && <div className="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-1 shadow-lg border-2 border-white"><Check className="w-3 h-3" /></div>}
                                             {checkResult === 'incorrect' && <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg border-2 border-white"><X className="w-3 h-3" /></div>}
                                          </button>

                                          {!readOnly && openDropdownIdx === idx && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white border-2 border-stone-200 rounded-2xl shadow-2xl z-[60] min-w-[120px] overflow-hidden animate-in fade-in zoom-in duration-200">
                                              <div className="p-1.5 bg-stone-50 border-b border-stone-100 text-center">
                                                <span className="text-[7px] font-black uppercase tracking-widest text-stone-400">Spelling Options</span>
                                              </div>
                                              {getOptionsForPhoneme(tile.phoneme!, parseInt(lessonStep), parseInt(lessonSubstep)).map(opt => (
                                                <button
                                                  key={opt}
                                                  onClick={() => {
                                                    setCipherResults(prev => ({ ...prev, [idx]: { text: opt, type: tile.type } }));
                                                    setOpenDropdownIdx(null);
                                                    setCheckResult(null);
                                                  }}
                                                  className="w-full px-4 py-3 text-2xl font-black hover:bg-purple-600 hover:text-white text-stone-900 border-b last:border-0 border-stone-50 transition-all active:scale-95"
                                                >
                                                  {opt}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-end">
                                        <Tile data={tile} size="xl" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="absolute inset-0 border-2 border-transparent group-hover/card:border-red-800/10 rounded-2xl transition-colors pointer-events-none" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-end justify-center gap-4">
                        {displayTiles.map((tile, idx) => (
                          <div key={idx} className="relative flex flex-col items-center">
                            {tile.isCipher ? (
                              <div className="flex flex-col items-center">
                                <div className="mb-2 px-3 py-1 bg-white border-2 border-purple-200 rounded-full shadow-sm animate-bounce">
                                  <span className="text-xl font-bold text-purple-600">/{tile.phoneme}/</span>
                                </div>
                                <div className="relative">
                                  <button
                                    onClick={!readOnly ? () => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx) : undefined}
                                    className={`relative min-w-[5rem] h-20 rounded-xl border-x border-t border-b-4 flex flex-col items-center justify-center transition-all group/slot
                                      ${checkResult === 'correct' ? 'border-emerald-500 bg-emerald-50 shadow-lg' :
                                        checkResult === 'incorrect' ? 'border-red-500 bg-red-50' :
                                        cipherResults[idx] ? 'border-purple-500 bg-purple-50 shadow-lg scale-105' :
                                        openDropdownIdx === idx ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-200' :
                                        'border-dashed border-stone-300 bg-white/10 hover:border-stone-400'}`}
                                  >
                                     {cipherResults[idx] ? (
                                       <div className="scale-110 animate-in zoom-in duration-300">
                                         <Tile data={cipherResults[idx]} size="xl" />
                                       </div>
                                     ) : (
                                       <div className="w-8 h-1 bg-stone-200 rounded-full" />
                                     )}
                                     {checkResult === 'correct' && <div className="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-1 shadow-lg border-2 border-white"><Check className="w-3 h-3" /></div>}
                                     {checkResult === 'incorrect' && <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg border-2 border-white"><X className="w-3 h-3" /></div>}
                                  </button>

                                  {!readOnly && openDropdownIdx === idx && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white border-2 border-stone-200 rounded-2xl shadow-2xl z-[60] min-w-[120px] overflow-hidden animate-in fade-in zoom-in duration-200">
                                      <div className="p-1.5 bg-stone-50 border-b border-stone-100 text-center">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-stone-400">Spelling Options</span>
                                      </div>
                                      {getOptionsForPhoneme(tile.phoneme!, parseInt(lessonStep), parseInt(lessonSubstep)).map(opt => (
                                        <button
                                          key={opt}
                                          onClick={() => {
                                            setCipherResults(prev => ({ ...prev, [idx]: { text: opt, type: tile.type } }));
                                            setOpenDropdownIdx(null);
                                            setCheckResult(null);
                                          }}
                                          className="w-full px-4 py-3 text-2xl font-black hover:bg-purple-600 hover:text-white text-stone-900 border-b last:border-0 border-stone-50 transition-all active:scale-95"
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-end">
                                <Tile data={tile} size="xl" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                 </div>

                 <div className="w-full max-w-3xl relative z-10">
                    <div className="flex justify-center gap-4">
                       {!readOnly && <button onClick={() => initCipherGame(cipherWord)} className="px-8 py-4 text-[10px] font-black uppercase text-stone-500 hover:text-white transition-colors">Reset Cipher</button>}
                       {!readOnly && Object.keys(cipherResults).length === displayTiles.filter(t => t.isCipher).length && !checkResult && (
                         <button onClick={checkAnswer} className="px-16 py-5 bg-red-800 text-white rounded-2xl font-black uppercase text-sm tracking-[0.3em] shadow-2xl hover:bg-red-700 transition-all animate-in zoom-in active:scale-95">Verify Spelling</button>
                       )}
                       {checkResult === 'correct' && (
                         <div className="flex flex-col items-center gap-6 animate-in zoom-in-95">
                            <div className="text-emerald-400 font-black uppercase tracking-[0.2em] flex items-center gap-3 text-xl"><CheckCircle2 className="w-10 h-10" /> Mastery Locked</div>
                            {!readOnly && <button onClick={() => setCipherWord(null)} className="px-12 py-4 bg-[#fdf6e3] text-stone-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-white transition-all">Return to Mission</button>}
                         </div>
                       )}
                       {checkResult === 'incorrect' && (
                         <div className="flex flex-col items-center gap-6 animate-in shake">
                            <div className="text-red-500 font-black uppercase tracking-[0.2em] flex items-center gap-3 text-xl"><X className="w-10 h-10" /> Phonetic Conflict</div>
                            {!readOnly && <button onClick={() => { setCipherResults({}); initCipherGame(cipherWord); }} className="px-12 py-4 bg-red-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-800">Recalibrate</button>}
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {(viewMode === 'grid' || viewMode === 'cipher') && (
           <div className="absolute inset-0 z-40 pointer-events-none">
              {visibleMarks.map(mark => (
                <Draggable key={mark.id} initialPos={{ x: mark.x, y: mark.y }} onDragEnd={(pos) => !readOnly && updateMark(mark.id, pos)} className={readOnly ? 'pointer-events-none' : 'pointer-events-auto'}>
                   <div className="relative group/mark flex items-center justify-center transition-transform hover:scale-110 active:cursor-grabbing" style={{ transform: `scale(${mark.scale})` }}>
                      <CodingMarkContent mark={mark} />
                      {!readOnly && <div
                         onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startScale = mark.scale;
                            const handleMove = (moveEvent: PointerEvent) => {
                               const delta = (moveEvent.clientX - startX) / 100;
                               updateMark(mark.id, { scale: Math.max(0.5, Math.min(5, startScale + delta)) });
                            };
                            const handleUp = () => {
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                         }}
                         className="absolute -bottom-2 -right-2 w-6 h-6 bg-red-800 text-white rounded-full flex items-center justify-center shadow-lg cursor-nwse-resize opacity-0 group-hover/mark:opacity-100 transition-opacity z-50"
                      >
                         <ArrowDown className="w-3 h-3 rotate-[-45deg]" />
                      </div>}
                      {!readOnly && <button
                        onClick={() => setMarks((prev: CodingMark[]) => prev.filter((m: CodingMark) => m && m.id !== mark.id))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/mark:opacity-100 transition-opacity z-50"
                      >
                        <X className="w-3 h-3" />
                      </button>}
                   </div>
                </Draggable>
              ))}
           </div>
        )}

        <canvas
          ref={syncedDrawing.canvasRef}
          onPointerDown={syncedDrawing.onPointerDown}
          onPointerMove={syncedDrawing.onPointerMove}
          onPointerUp={syncedDrawing.onPointerUp}
          onPointerCancel={syncedDrawing.onPointerCancel}
          className={`absolute inset-0 z-20 touch-none ${readOnly || tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
        />
      </div>

      {viewMode === 'grid' && (
         <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-stone-950/80 backdrop-blur-md px-6 py-2 rounded-full border border-stone-800 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 flex items-center gap-6 z-50">
            <div className="flex items-center gap-2"><CloudSun className="w-4 h-4 text-blue-400" /> Sky Line</div>
            <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-stone-400" /> Plane Line</div>
            <div className="flex items-center gap-2"><Flower className="w-4 h-4 text-green-400" /> Grass Line</div>
            <div className="flex items-center gap-2"><Bug className="w-4 h-4 text-amber-800 opacity-60" /> Worm Line</div>
         </div>
      )}
    </div>
  );
};

export default Spelling;
