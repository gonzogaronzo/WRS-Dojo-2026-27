
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Lesson, WordCard, Slide, SlideElement, GroupProfile, LESSON_PARTS, LessonPart } from '../types';
import { generateId, parseLessonText, getTileColor, parseWordToTiles } from '../utils';
import { MASTER_GRAPHEMES, isSubstepAtLeast, getPhonemeForGrapheme, getOptionsForPhoneme } from '../masterCurriculum';
import { 
  Plus, Trash2, Save, FileText, Image as ImageIcon, Type, MonitorPlay, 
  Presentation, LayoutTemplate, Import, Check, Download, Upload, 
  FolderOpen, Sparkles, Scroll, X, Users, RefreshCw, Layers, List, 
  RotateCcw, Edit3, Gamepad2, Printer, HelpCircle, Grid3X3, ArrowRight, 
  Wand2, Settings, Zap, ListPlus, Terminal, Info, ScrollText, Star, 
  PlusCircle as PlusIcon, History, LayoutPanelLeft, Link, GripVertical,
  AlignLeft, PenTool, Headphones, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Copy, BookOpen
} from 'lucide-react';
import TeachConcepts from './modules/TeachConcepts';
import { WrsPartPlanning, WrsPlanOverview } from './WrsPlanFields';
import { createEmptyWrsLessonPlan, normalizeWrsLessonPlan } from '../wrsLessonPlan';
import { normalizeRuntimeLessonPlan, runtimeLessonToLegacyLesson } from '../runtimeLesson';

/**
 * REUSABLE SYLLABLE BUILDER SUB-COMPONENT
 */
const SyllableBuilder: React.FC<{
  value: string;
  onChange: (val: string) => void;
  type: 'word' | 'cipher';
}> = ({ value, onChange, type }) => {
  const [parts, setParts] = useState<string[]>(['']);

  useEffect(() => {
    if (value && parts.every(p => p === '')) {
      const regex = type === 'word' ? /\|([^|]*)\|/g : /\/([^/]*)\//g;
      const matches = Array.from(value.matchAll(regex)).map(m => m[1]);
      if (matches.length > 0) setParts(matches);
      else setParts([value]);
    }
  }, []);

  const handlePartChange = (idx: number, val: string) => {
    const next = [...parts];
    next[idx] = val;
    setParts(next);
    
    const delimiter = type === 'word' ? '|' : '/';
    const joined = next
      .filter(p => p.trim() !== '')
      .map(p => `${delimiter}${p}${delimiter}`)
      .join('');
    
    onChange(joined || next[0]); 
  };

  const addPart = () => setParts([...parts, '']);
  const removePart = (idx: number) => {
    if (parts.length > 1) {
      const next = parts.filter((_, i) => i !== idx);
      setParts(next);
      handlePartChange(0, next[0]); 
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-stone-100 p-3 rounded-xl border border-stone-200">
      {parts.map((p, i) => (
        <div key={i} className="flex items-center gap-1 group">
          <input
            type="text"
            value={p}
            onChange={(e) => handlePartChange(i, e.target.value)}
            className="w-24 p-2 bg-white border border-stone-300 rounded-lg text-sm font-bold text-center text-stone-900 focus:border-red-800 outline-none"
            placeholder={type === 'cipher' ? 'Sound' : 'Syl'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addPart(); }
              if (e.key === 'Backspace' && p === '' && parts.length > 1) { e.preventDefault(); removePart(i); }
            } }
          />
          {i < parts.length - 1 && <span className="text-stone-300 font-bold">+</span>}
        </div>
      ))}
      <button type="button" onClick={addPart} className="p-2 bg-stone-800 text-white rounded-full hover:bg-red-800 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
    </div>
  );
};

/**
 * SMART CIPHER WORD ENTRY COMPONENT
 */
const CipherWordEntry: React.FC<{
  words: string[];
  onUpdate: (words: string[]) => void;
  step: string;
  substep: string;
}> = ({ words, onUpdate, step, substep }) => {
  const [input, setInput] = useState('');
  
  const addWord = () => {
    const trimmed = input.trim();
    if (trimmed && !words.includes(trimmed)) {
      onUpdate([...words, trimmed]);
      setInput('');
    }
  };

  const analyzeWord = (word: string) => {
    const tiles = parseWordToTiles(word);
    const s = parseInt(step, 10);
    const ss = parseInt(substep, 10);
    
    return tiles.map(tile => {
      const phoneme = getPhonemeForGrapheme(tile.text);
      const options = phoneme ? getOptionsForPhoneme(phoneme, s, ss) : [];
      return {
        ...tile,
        phoneme,
        options,
        isCipherable: options.length > 1
      };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWord())}
            placeholder="Enter target word (e.g. vacation, catch)..."
            className="w-full bg-stone-950 border-2 border-stone-800 rounded-xl p-4 text-white font-bold outline-none focus:border-amber-500 transition-all pl-12"
          />
          <PlusIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
        </div>
        <button 
          type="button"
          onClick={addWord}
          className="px-6 bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg active:scale-95"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {words.map((word, i) => {
          const analysis = analyzeWord(word);
          const cipherableCount = analysis.filter(a => a.isCipherable).length;
          
          return (
            <div key={i} className={`group relative px-4 py-3 rounded-2xl border-2 flex flex-col gap-2 transition-all hover:shadow-xl ${cipherableCount > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-stone-800 bg-stone-900/50'}`}>
              <div className="flex items-center justify-between gap-4">
                <span className="font-serif font-black text-lg text-white">{word}</span>
                <button 
                  type="button"
                  onClick={() => onUpdate(words.filter((_, idx) => idx !== i))}
                  className="text-stone-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {analysis.map((a, ai) => (
                  <div key={ai} className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase flex flex-col items-center ${a.isCipherable ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-500'}`}>
                    <span>{a.text}</span>
                    {a.isCipherable && <span className="text-[8px] opacity-70">/{a.phoneme}/</span>}
                  </div>
                ))}
              </div>

              {cipherableCount === 0 && (
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-red-400/80 uppercase tracking-tighter">
                  <AlertTriangle className="w-3 h-3" /> No Cipherable Sounds at {step}.{substep}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface LessonFormProps {
  initialLesson?: Lesson;
  activeGroup?: GroupProfile;
  onSave: (lesson: Lesson, run?: boolean) => void;
  onUpdateGroup?: (group: GroupProfile) => void;
}

const emptyLesson: Lesson = {
  schemaVersion: 2,
  id: '',
  title: '',
  step: '1',
  substep: '1',
  conceptNotes: '',
  conceptNotes7: '',
  cipherWords: [],
  cipherDistractors: [],
  googleSlidesUrl: '',
  slides: [],
  quickDrill: [],
  quickDrillReverse: [],
  wordCards: [],
  wordListReading: [],
  wordListReadingAuto: true,
  sentences: [],
  dictation: {
    sounds: [],
    realWords: [],
    wordElements: [],
    nonsenseWords: [],
    phrases: [],
    sentences: []
  },
  hfwList: [],
  affixPractice: [],
  passage: '',
  wrsPlan: createEmptyWrsLessonPlan()
};

const LessonForm: React.FC<LessonFormProps> = ({ initialLesson, activeGroup, onSave, onUpdateGroup }) => {
  const [formData, setFormData] = useState<Lesson>(() => {
    if (initialLesson) return { ...initialLesson, schemaVersion: 2, wrsPlan: normalizeWrsLessonPlan(initialLesson.wrsPlan) };
    const base = { ...emptyLesson, id: generateId(), wrsPlan: createEmptyWrsLessonPlan() };
    if (activeGroup) {
      base.quickDrill = [...activeGroup.inventory.learnedSounds];
      base.hfwList = [...activeGroup.inventory.learnedHFW];
    }
    return base;
  });

  const [inputStates, setInputStates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (initialLesson) {
      init.quickDrill = initialLesson.quickDrill.join(', ');
      init.quickDrillReverse = (initialLesson.quickDrillReverse || []).join(', ');
      init.wordCards = initialLesson.wordCards.map(c => c.text).join(', ');
      init.hfwList = initialLesson.hfwList.join(', ');
      init.wordListReading = (initialLesson.wordListReading || []).join(', ');
      init.dSounds = initialLesson.dictation.sounds.join(', ');
      init.dRealWords = initialLesson.dictation.realWords.join(', ');
      init.dWordElements = initialLesson.dictation.wordElements.join(', ');
      init.dNonsenseWords = initialLesson.dictation.nonsenseWords.join(', ');
      init.dPhrases = initialLesson.dictation.phrases.join(', ');
      init.dSentences = initialLesson.dictation.sentences.join('\n');
    }
    return init;
  });

  useEffect(() => {
    if (initialLesson) {
      setFormData({ ...initialLesson, schemaVersion: 2, wrsPlan: normalizeWrsLessonPlan(initialLesson.wrsPlan) });
      setInputStates({
        quickDrill: initialLesson.quickDrill.join(', '),
        quickDrillReverse: (initialLesson.quickDrillReverse || []).join(', '),
        wordCards: initialLesson.wordCards.map(c => c.text).join(', '),
        hfwList: initialLesson.hfwList.join(', '),
        wordListReading: (initialLesson.wordListReading || []).join(', '),
        dSounds: initialLesson.dictation.sounds.join(', '),
        dRealWords: initialLesson.dictation.realWords.join(', '),
        dWordElements: initialLesson.dictation.wordElements.join(', '),
        dNonsenseWords: initialLesson.dictation.nonsenseWords.join(', '),
        dPhrases: initialLesson.dictation.phrases.join(', '),
        dSentences: initialLesson.dictation.sentences.join('\n'),
      });
    }
  }, [initialLesson]);

  const handleSmartInput = (fieldKey: string, value: string, syncFn: (items: string[]) => void, delimiter: RegExp = /[,\n]/) => {
    setInputStates(prev => ({ ...prev, [fieldKey]: value }));
    const items = value.split(delimiter).map(s => s.trim()).filter(Boolean);
    const uniqueItems = Array.from(new Set(items));
    syncFn(uniqueItems);
  };

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showSyntaxGuide, setShowSyntaxGuide] = useState(false);
  const [usePart1ForPart6, setUsePart1ForPart6] = useState<boolean>(() => {
    if (!initialLesson) return true;
    return (!initialLesson.quickDrillReverse || initialLesson.quickDrillReverse.length === 0);
  });

  const [showMagBoardBuilder, setShowMagBoardBuilder] = useState(false);
  const [isBulkCipherMode, setIsBulkCipherMode] = useState(false);
  const [bulkCipherText, setBulkCipherText] = useState('');
  const [collapsedSlides, setCollapsedSlides] = useState<Set<string>>(new Set());

  const toggleSlideCollapse = (id: string) => {
    setCollapsedSlides(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const duplicateSlide = (slide: Slide) => {
    const newSlide = {
      ...slide,
      id: generateId(),
      elements: slide.elements?.map(el => ({ ...el, id: generateId() })) || []
    };
    setFormData(prev => ({
      ...prev,
      slides: [...prev.slides, newSlide]
    }));
  };

  // --- ELEMENT MANAGEMENT ---
  const addElementToSlide = (slideId: string, type: SlideElement['type']) => {
    setFormData(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === slideId ? {
        ...s,
        type: 'mixed',
        elements: [...(s.elements || []), {
          id: generateId(),
          type,
          content: type === 'word' ? 'word' : '',
          x: 0,
          y: type === 'text' ? 200 : 0,
          scale: 1
        }]
      } : s)
    }));
  };

  const removeElementFromSlide = (slideId: string, elementId: string) => {
    setFormData(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === slideId ? {
        ...s,
        elements: s.elements?.filter(e => e.id !== elementId)
      } : s)
    }));
  };

  const updateElementInSlide = (slideId: string, elementId: string, updates: Partial<SlideElement>) => {
    setFormData(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === slideId ? {
        ...s,
        elements: s.elements?.map(e => e.id === elementId ? { ...e, ...updates } : e)
      } : s)
    }));
  };

  // Legacy Migration: If a slide is old-style, wrap it in an element array
  useEffect(() => {
    const needsMigration = formData.slides.some(s => !s.elements && s.content);
    if (needsMigration) {
      setFormData(prev => ({
        ...prev,
        slides: prev.slides.map(s => {
          if (!s.elements && s.content) {
            return {
              ...s,
              type: 'mixed',
              elements: [{ id: generateId(), type: s.type as any, content: s.content, x: 0, y: 0, scale: 1 }]
            };
          }
          return s;
        })
      }));
    }
  }, [formData.slides]);

  const currentStepNum = parseInt(formData.step, 10);
  const currentSubstepNum = parseInt(formData.substep, 10);

  const stepIntelligence = useMemo(() => {
    const newlyIntroduced = MASTER_GRAPHEMES.filter(g => 
      g.step === currentStepNum && g.substep === currentSubstepNum
    );
    const reviewItems = MASTER_GRAPHEMES.filter(g => 
      isSubstepAtLeast(currentStepNum, currentSubstepNum, `${g.step}.${g.substep}`) &&
      !(g.step === currentStepNum && g.substep === currentSubstepNum)
    );
    return { new: newlyIntroduced, review: reviewItems };
  }, [currentStepNum, currentSubstepNum]);

  const addSoundToPart = (sound: string, part: 'p1' | 'p8' | 'p7') => {
    const cleanSound = sound.replace(/^-/, '');
    if (part === 'p1') {
      if (!formData.quickDrill.includes(cleanSound)) {
        setFormData(prev => ({ ...prev, quickDrill: [...prev.quickDrill, cleanSound] }));
      }
    } else if (part === 'p8') {
      if (!formData.dictation.sounds.includes(cleanSound)) {
        setFormData(prev => ({ 
          ...prev, 
          dictation: { ...prev.dictation, sounds: [...prev.dictation.sounds, cleanSound] } 
        }));
      }
    }
  };

  const updateField = (field: keyof Lesson, value: any) => { setFormData(prev => ({ ...prev, [field]: value })); };
  const addSlide = () => setFormData(prev => ({ ...prev, slides: [...(prev.slides || []), { id: generateId(), title: '', content: '', type: 'mixed', elements: [] }] }));
  const removeSlide = (id: string) => setFormData(prev => ({ ...prev, slides: prev.slides.filter(s => s.id !== id) }));
  
  const scrollToSection = (id: string) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    let data: any;
    try {
      data = JSON.parse(importText);
    } catch {
      // Plain text remains a supported import format.
      const parsed = parseLessonText(importText, formData.step, formData.substep);
      setFormData(prev => ({ ...prev, ...parsed }));
      setShowImport(false);
      setImportText('');
      setImportError('');
      return;
    }

    const runtimeCandidate = data?.schemaVersion === 'wrs-runtime-v1'
      ? data
      : data?.runtimePlan;
    const looksLikeRuntime = Boolean(runtimeCandidate && typeof runtimeCandidate === 'object');
    const runtimePlan = normalizeRuntimeLessonPlan(runtimeCandidate);

    if (looksLikeRuntime && !runtimePlan) {
      setImportError('Runtime lesson was not accepted: expected a wrs-runtime-v1 lesson with id, valid focus, and Parts 1–10.');
      return;
    }

    try {
      const importedData = runtimePlan
        ? { ...data, ...runtimeLessonToLegacyLesson(runtimePlan), runtimePlan }
        : data;
      if (importedData.step || importedData.substep) {
        // Merge with emptyLesson to ensure all required fields exist
        const merged: Lesson = {
          ...emptyLesson,
          ...importedData,
          schemaVersion: 2,
          wrsPlan: normalizeWrsLessonPlan(data.wrsPlan),
          id: formData.id, // Keep current ID if it's an edit
          step: String(importedData.step || formData.step),
          substep: String(importedData.substep || formData.substep)
        };
        
        // Ensure dictation fields are present
        if (importedData.dictation) {
          merged.dictation = { ...emptyLesson.dictation, ...importedData.dictation };
        }

        setFormData(merged);
        setInputStates({
          quickDrill: merged.quickDrill.join(', '),
          quickDrillReverse: (merged.quickDrillReverse || []).join(', '),
          wordCards: merged.wordCards.map(card => card.text).join(', '),
          hfwList: merged.hfwList.join(', '),
          wordListReading: (merged.wordListReading || []).join(', '),
          dSounds: merged.dictation.sounds.join(', '),
          dRealWords: merged.dictation.realWords.join(', '),
          dWordElements: merged.dictation.wordElements.join(', '),
          dNonsenseWords: merged.dictation.nonsenseWords.join(', '),
          dPhrases: merged.dictation.phrases.join(', '),
          dSentences: merged.dictation.sentences.join('\n')
        });
        setShowImport(false);
        setImportText('');
        setImportError('');
        return;
      }
      setImportError('JSON lesson was not accepted: it needs step/substep fields, or a complete wrs-runtime-v1 runtimePlan.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown runtime validation error.';
      setImportError(`Runtime lesson was not accepted: ${detail}`);
    }
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `wrs_lesson_${formData.step}_${formData.substep}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSubmit = (e?: React.FormEvent, run = false) => { 
    if (e) e.preventDefault(); 
    const finalTitle = formData.title || `Step ${formData.step}.${formData.substep} Lesson`;
    onSave({ ...formData, title: finalTitle }, run); 
  };

  return (
    <div className="flex gap-6 max-w-7xl mx-auto my-8 px-4 relative text-stone-900">
      <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end">
          {showSyntaxGuide && (
            <div className="mb-4 p-6 bg-white rounded-2xl border-4 border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-2 origin-bottom-right w-80">
                <div className="flex items-center gap-3 mb-4 border-b border-stone-100 pb-2">
                  <ScrollText className="w-5 h-5 text-red-800" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-stone-800">Sensei's Marker Key</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold"><span>Welded: /ang/</span><span className="text-emerald-600">Green</span></div>
                  <div className="flex justify-between text-[10px] font-bold"><span>Vowel Team: [ee]</span><span className="text-orange-600">Peach</span></div>
                  <div className="flex justify-between text-[10px] font-bold"><span>Syllable: |val|</span><span className="text-stone-900">White</span></div>
                </div>
            </div>
          )}
          <button type="button" onClick={() => setShowSyntaxGuide(!showSyntaxGuide)} className="p-4 rounded-full shadow-2xl border-4 bg-red-800 border-stone-900 text-white hover:bg-stone-900 transition-all"><HelpCircle className="w-6 h-6" /></button>
      </div>

      <div className="hidden lg:block w-64 flex-shrink-0">
         <div className="sticky top-8 bg-white rounded-xl shadow-lg border border-stone-200 p-4 max-h-[85vh] overflow-y-auto">
             <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 border-b pb-2">Navigation</div>
             <ul className="space-y-1">
               {LESSON_PARTS.slice(1).map((part) => (
                 <li key={part.id}>
                    <button onClick={() => scrollToSection(`section-${part.id}`)} className="w-full text-left px-3 py-2 rounded text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors flex justify-between">
                       <span>{part.title}</span>
                    </button>
                 </li>
               ))}
             </ul>
         </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-[#fdf6e3] rounded-xl shadow-2xl border-t-8 border-stone-800 p-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b-2 border-stone-300 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-stone-900 flex items-center gap-3 font-serif"><Scroll className="w-8 h-8 text-red-800" />Lesson Pathway</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleDownload} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium"><Download className="w-4 h-4" />Export JSON</button>
              <button type="button" onClick={() => setShowImport(true)} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium"><Import className="w-4 h-4" />Import</button>
              <button type="button" onClick={() => handleSubmit(undefined, false)} className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 transition-all shadow-md font-bold uppercase tracking-widest text-[10px]"><Save className="w-4 h-4" />Save to Dojo</button>
              <button type="button" onClick={() => handleSubmit(undefined, true)} className="flex items-center gap-2 bg-red-800 text-[#fdf6e3] px-6 py-2 rounded-lg hover:bg-red-900 transition-all shadow-md font-bold uppercase tracking-wider"><MonitorPlay className="w-4 h-4" />Run Mission</button>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <section className="bg-stone-900 p-8 rounded-[2rem] border-4 border-stone-800 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-red-500" />
                <h3 className="text-xl font-black font-serif uppercase tracking-widest">Mission Parameters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Step</label>
                  <input type="text" value={formData.step} onChange={e => updateField('step', e.target.value)} className="w-full bg-stone-950 border-2 border-stone-800 rounded-xl p-4 font-black text-xl text-white focus:border-red-800 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Substep</label>
                  <input type="text" value={formData.substep} onChange={e => updateField('substep', e.target.value)} className="w-full bg-stone-950 border-2 border-stone-800 rounded-xl p-4 font-black text-xl text-white focus:border-red-800 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Custom Title (Optional)</label>
                  <input type="text" value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder={`Step ${formData.step}.${formData.substep} Lesson`} className="w-full bg-stone-950 border-2 border-stone-800 rounded-xl p-4 font-bold text-stone-300 focus:border-red-800 outline-none" />
                </div>
              </div>
            </section>

            <WrsPlanOverview
              lesson={formData}
              onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))}
              onLessonChange={setFormData}
            />

            <section id="section-1" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative scroll-mt-24">
              <div className="flex items-center gap-2 mb-4">
                <Grid3X3 className="w-5 h-5 text-red-800" />
                <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 1: Quick Drill Sounds</label>
              </div>
              <WrsPartPlanning part={1} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              <input 
                type="text" 
                value={inputStates.quickDrill || formData.quickDrill.join(', ')} 
                onChange={e => handleSmartInput('quickDrill', e.target.value, (items) => updateField('quickDrill', items))} 
                className="w-full border border-stone-300 rounded-xl p-4 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50 text-stone-900 font-mono text-sm" 
                placeholder="e.g., a, b, sh, ch, ang, ild" 
              />
            </section>

            <section id="section-2" className="bg-stone-50 p-6 rounded-2xl border border-stone-200 scroll-mt-24">
              <div className="flex items-center justify-between mb-4">
                <label className="text-lg font-bold text-stone-800 flex items-center gap-2 font-serif"><MonitorPlay className="w-5 h-5 text-red-800" />Part 2: Teach Concepts (Reading)</label>
              </div>
              <WrsPartPlanning part={2} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              
              <div className="mb-6 grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Concept Notes (Reading)</label>
                  <textarea value={formData.conceptNotes} onChange={e => updateField('conceptNotes', e.target.value)} className="w-full border border-stone-300 rounded-xl p-4 h-24 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" placeholder="Explain the new concept..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Google Slides URL (Optional)</label>
                  <div className="flex gap-2">
                    <div className="bg-stone-100 p-4 rounded-xl border border-stone-300 flex-1 flex items-center gap-3">
                       <Link className="w-4 h-4 text-stone-400" />
                       <input 
                         type="text" 
                         value={formData.googleSlidesUrl || ''} 
                         onChange={e => updateField('googleSlidesUrl', e.target.value)}
                         className="bg-transparent border-none outline-none text-xs font-bold text-stone-600 w-full"
                         placeholder="https://docs.google.com/presentation/d/..."
                       />
                    </div>
                  </div>
                  <p className="mt-2 text-[9px] text-stone-400 italic">If provided, this presentation will be embedded in Part 2 and Part 7.</p>
                </div>
              </div>

              <div className="space-y-6">
                {formData.slides?.map((slide, sIdx) => {
                  const isCollapsed = collapsedSlides.has(slide.id);
                  return (
                    <div key={slide.id} className={`bg-white rounded-2xl border-2 border-stone-300 shadow-md animate-in fade-in zoom-in duration-300 overflow-hidden ${isCollapsed ? 'p-4' : 'p-6'}`}>
                      <div className={`flex items-center justify-between ${isCollapsed ? '' : 'mb-4 border-b border-stone-100 pb-3'}`}>
                         <div className="flex items-center gap-3">
                            <span className="bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">{sIdx + 1}</span>
                            <input 
                              type="text" 
                              value={slide.title} 
                              onChange={e => updateField('slides', formData.slides.map(s => s.id === slide.id ? { ...s, title: e.target.value } : s))}
                              placeholder="Slide Title (e.g. Concept: Suffixes)" 
                              className="font-bold font-serif text-stone-800 outline-none text-lg border-b-2 border-transparent focus:border-red-800 transition-all"
                            />
                         </div>
                         <div className="flex items-center gap-4">
                            <button type="button" onClick={() => toggleSlideCollapse(slide.id)} className="text-stone-400 hover:text-stone-600 transition-colors">
                               {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                            </button>
                            <button type="button" onClick={() => duplicateSlide(slide)} className="text-stone-400 hover:text-emerald-600 transition-colors" title="Duplicate Slide">
                               <Copy className="w-5 h-5" />
                            </button>
                            <button type="button" onClick={() => removeSlide(slide.id)} className="text-stone-300 hover:text-red-600 transition-colors">
                               <Trash2 className="w-5 h-5" />
                            </button>
                         </div>
                      </div>

                      {!isCollapsed && (
                        <>
                          <div className="space-y-4 mb-6">
                             <div className="flex items-center gap-2 mb-2">
                                <GripVertical className="w-4 h-4 text-stone-300" />
                                <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Canvas Layers</span>
                             </div>
                             
                             <div className="grid gap-2">
                               {slide.elements?.map((el) => (
                                 <div key={el.id} className="flex gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200 group hover:border-red-200 transition-all">
                                    <div className={`p-2 rounded-lg ${el.type === 'word' ? 'bg-emerald-100 text-emerald-700' : el.type === 'image' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                       {el.type === 'word' ? <LayoutPanelLeft className="w-4 h-4" /> : el.type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <input 
                                         value={el.content}
                                         onChange={e => updateElementInSlide(slide.id, el.id, { content: e.target.value })}
                                         placeholder={el.type === 'word' ? "Shorthand: /ang/ /sh/..." : el.type === 'image' ? "Image URL..." : "Normal text..."}
                                         className="w-full bg-transparent border-none outline-none font-bold text-sm text-stone-800 placeholder-stone-300"
                                       />
                                       {el.type === 'word' && el.content && (
                                         <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                                           {parseWordToTiles(el.content).map((t: any, i: number) => (
                                             <div key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${getTileColor(t.type)}`}>
                                               {t.text || ' '}
                                             </div>
                                           ))}
                                         </div>
                                       )}
                                    </div>
                                    <button type="button" onClick={() => removeElementFromSlide(slide.id, el.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-600 transition-all"><X className="w-4 h-4" /></button>
                                 </div>
                               ))}
                               {(!slide.elements || slide.elements.length === 0) && (
                                  <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-xl">
                                     <p className="text-[10px] font-black uppercase text-stone-300 tracking-widest">Empty Canvas</p>
                                  </div>
                               )}
                             </div>
                          </div>

                          <div className="flex gap-2 p-2 bg-stone-100 rounded-xl">
                             <button type="button" onClick={() => addElementToSlide(slide.id, 'word')} className="flex-1 py-2 bg-white rounded-lg border border-stone-200 text-[10px] font-black uppercase text-stone-600 flex items-center justify-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 transition-all shadow-sm">
                                <LayoutPanelLeft className="w-4 h-4" /> Add Word/Tiles
                             </button>
                             <button type="button" onClick={() => addElementToSlide(slide.id, 'text')} className="flex-1 py-2 bg-white rounded-lg border border-stone-200 text-[10px] font-black uppercase text-stone-600 flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm">
                                <Type className="w-4 h-4" /> Add Text Box
                             </button>
                             <button type="button" onClick={() => addElementToSlide(slide.id, 'image')} className="flex-1 py-2 bg-white rounded-lg border border-stone-200 text-[10px] font-black uppercase text-stone-600 flex items-center justify-center gap-2 hover:bg-purple-50 hover:text-purple-700 transition-all shadow-sm">
                                <ImageIcon className="w-4 h-4" /> Add Picture
                             </button>
                          </div>

                          <div className="mt-4 pt-4 border-t border-stone-100">
                             <label className="text-[10px] font-black uppercase text-stone-400 mb-2 block">Teacher Notes (Visible during Lesson)</label>
                             <textarea 
                                value={slide.notes || ''} 
                                onChange={e => updateField('slides', formData.slides.map(s => s.id === slide.id ? { ...s, notes: e.target.value } : s))}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs italic text-stone-600 outline-none focus:border-red-800"
                                placeholder="Tell students to tap /ang/ with one finger..."
                             />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                <button 
                  type="button" 
                  onClick={addSlide} 
                  className="w-full py-6 border-4 border-dashed border-stone-200 rounded-2xl text-stone-400 hover:border-red-800 hover:text-red-800 hover:bg-red-50 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <PlusIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-[0.3em]">Add New Concept Slide</span>
                </button>
              </div>
            </section>

            <section id="section-3" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm scroll-mt-24">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-red-800" />
                  <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 3: Word Cards & HFW</label>
                </div>
              </div>
              <WrsPartPlanning part={3} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Word Cards (Regular/Nonsense)</label>
                  <textarea 
                    value={inputStates.wordCards || formData.wordCards.map(c => c.text).join(', ')} 
                    onChange={e => {
                      const val = e.target.value;
                      handleSmartInput('wordCards', val, (items) => {
                        // Smart update: preserve IDs for words that didn't change
                        const currentMap = new Map(formData.wordCards.map(c => [c.text, c.id]));
                        const newCards = items.map(w => ({
                          id: currentMap.get(w) || generateId(),
                          text: w,
                          type: 'regular' as const
                        }));
                        updateField('wordCards', newCards);
                      });
                    }}
                    className="w-full border border-stone-300 rounded-xl p-4 h-32 text-sm bg-stone-50 text-stone-900 font-mono focus:ring-2 focus:ring-red-800 outline-none" 
                    placeholder="cat, dog, ship..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">High Frequency Words (HFW)</label>
                  <textarea 
                    value={inputStates.hfwList || formData.hfwList.join(', ')} 
                    onChange={e => handleSmartInput('hfwList', e.target.value, (items) => updateField('hfwList', items))}
                    className="w-full border border-stone-300 rounded-xl p-4 h-32 text-sm bg-stone-50 text-stone-900 font-mono focus:ring-2 focus:ring-red-800 outline-none" 
                    placeholder="the, was, were..."
                  />
                </div>
              </div>
            </section>

            <section id="section-4" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm scroll-mt-24">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-red-800" />
                  <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 4: Wordlist Reading</label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-stone-400">Auto-generate from Word Cards?</span>
                  <input type="checkbox" checked={formData.wordListReadingAuto} onChange={e => updateField('wordListReadingAuto', e.target.checked)} className="w-4 h-4 accent-red-800" />
                </div>
              </div>
              <WrsPartPlanning part={4} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              {!formData.wordListReadingAuto && (
                <textarea 
                  value={inputStates.wordListReading || formData.wordListReading?.join(', ')} 
                  onChange={e => handleSmartInput('wordListReading', e.target.value, (items) => updateField('wordListReading', items))}
                  className="w-full border border-stone-300 rounded-xl p-4 h-32 text-sm bg-stone-50 text-stone-900 font-mono focus:ring-2 focus:ring-red-800 outline-none mb-4" 
                  placeholder="Custom wordlist for reading..."
                />
              )}
              
              <div className="mt-6 pt-6 border-t border-stone-100">
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Affix Practice (Prefixes/Suffixes)</label>
                <div className="space-y-3">
                  {formData.affixPractice?.map((affix, idx) => (
                    <div key={affix.id} className="flex gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <select 
                        value={affix.type} 
                        onChange={e => updateField('affixPractice', formData.affixPractice.map(a => a.id === affix.id ? { ...a, type: e.target.value } : a))}
                        className="bg-white border border-stone-300 rounded-lg px-2 text-[10px] font-black uppercase"
                      >
                        <option value="prefix">Prefix</option>
                        <option value="suffix">Suffix</option>
                        <option value="root">Root</option>
                      </select>
                      <input 
                        value={affix.text} 
                        onChange={e => updateField('affixPractice', formData.affixPractice.map(a => a.id === affix.id ? { ...a, text: e.target.value } : a))}
                        placeholder="Affix (e.g. -ing)"
                        className="flex-1 bg-transparent border-none outline-none font-bold text-sm"
                      />
                      <input 
                        value={affix.examples} 
                        onChange={e => updateField('affixPractice', formData.affixPractice.map(a => a.id === affix.id ? { ...a, examples: e.target.value } : a))}
                        placeholder="Examples (e.g. jumping, running)"
                        className="flex-1 bg-transparent border-none outline-none text-xs italic text-stone-500"
                      />
                      <button type="button" onClick={() => updateField('affixPractice', formData.affixPractice.filter(a => a.id !== affix.id))} className="text-stone-300 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => updateField('affixPractice', [...(formData.affixPractice || []), { id: generateId(), text: '', type: 'suffix', examples: '' }])}
                    className="w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-[10px] font-black uppercase text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-all"
                  >
                    + Add Affix Entry
                  </button>
                </div>
              </div>
            </section>

            <section id="section-5" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-4">
                <AlignLeft className="w-5 h-5 text-red-800" />
                <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 5: Sentence Reading</label>
              </div>
              <WrsPartPlanning part={5} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              <textarea 
                value={formData.sentences.join('\n')} 
                onChange={e => updateField('sentences', e.target.value.split('\n').filter(Boolean))}
                className="w-full border border-stone-300 rounded-xl p-4 h-32 text-sm bg-stone-50 text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" 
                placeholder="One sentence per line..."
              />
            </section>

            <section id="section-6" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm scroll-mt-24">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-red-800" />
                  <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 6: Quick Drill (Reverse)</label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-stone-400">Use Part 1 Sounds?</span>
                  <input type="checkbox" checked={usePart1ForPart6} onChange={e => setUsePart1ForPart6(e.target.checked)} className="w-4 h-4 accent-red-800" />
                </div>
              </div>
              <WrsPartPlanning part={6} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              {!usePart1ForPart6 && (
                <input 
                  type="text" 
                  value={inputStates.quickDrillReverse || formData.quickDrillReverse?.join(', ')} 
                  onChange={e => handleSmartInput('quickDrillReverse', e.target.value, (items) => updateField('quickDrillReverse', items))} 
                  className="w-full border border-stone-300 rounded-xl p-4 focus:ring-2 focus:ring-red-800 outline-none bg-stone-50 font-mono text-sm" 
                  placeholder="e.g., a, e, i, o, u" 
                />
              )}
            </section>

            <section id="section-7" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-4">
                <Edit3 className="w-5 h-5 text-red-800" />
                <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 7: Teach Concepts (Spelling)</label>
              </div>
              <WrsPartPlanning part={7} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              <textarea value={formData.conceptNotes7} onChange={e => updateField('conceptNotes7', e.target.value)} className="w-full border border-stone-300 rounded-xl p-4 h-32 text-sm bg-stone-50 text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" placeholder="Spelling logic and marking instructions..." />
            </section>

            <section id="section-8" className="bg-stone-100 p-6 rounded-2xl border border-stone-300 space-y-6 scroll-mt-24">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-red-800" />
                <label className="text-lg font-bold text-stone-800 font-serif">Part 8: Written Work (Dictation)</label>
              </div>
              <WrsPartPlanning part={8} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              <div className="grid md:grid-cols-2 gap-6">
                <div><label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Sounds</label><input type="text" value={inputStates.dSounds || formData.dictation.sounds.join(', ')} onChange={e => handleSmartInput('dSounds', e.target.value, (items) => updateField('dictation', {...formData.dictation, sounds: items}))} className="w-full border border-stone-300 rounded-xl p-4 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" /></div>
                <div><label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Real Words</label><input type="text" value={inputStates.dRealWords || formData.dictation.realWords.join(', ')} onChange={e => handleSmartInput('dRealWords', e.target.value, (items) => updateField('dictation', {...formData.dictation, realWords: items}))} className="w-full border border-stone-300 rounded-xl p-4 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" /></div>
                <div><label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Word Elements</label><input type="text" value={inputStates.dWordElements || formData.dictation.wordElements.join(', ')} onChange={e => handleSmartInput('dWordElements', e.target.value, (items) => updateField('dictation', {...formData.dictation, wordElements: items}))} className="w-full border border-stone-300 rounded-xl p-4 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" /></div>
                <div><label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Nonsense Words</label><input type="text" value={inputStates.dNonsenseWords || formData.dictation.nonsenseWords.join(', ')} onChange={e => handleSmartInput('dNonsenseWords', e.target.value, (items) => updateField('dictation', {...formData.dictation, nonsenseWords: items}))} className="w-full border border-stone-300 rounded-xl p-4 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" /></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Phrases</label><textarea value={inputStates.dPhrases || formData.dictation.phrases.join(', ')} onChange={e => handleSmartInput('dPhrases', e.target.value, (items) => updateField('dictation', {...formData.dictation, phrases: items}))} className="w-full border border-stone-300 rounded-xl p-4 h-20 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" /></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Sentences</label><textarea value={inputStates.dSentences || formData.dictation.sentences.join('\n')} onChange={e => handleSmartInput('dSentences', e.target.value, (items) => updateField('dictation', {...formData.dictation, sentences: items}), /\n/)} className="w-full border border-stone-300 rounded-xl p-4 h-32 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" /></div>
              </div>
            </section>

            <section id="section-9" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-red-800" />
                <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 9: Passage Reading</label>
              </div>
              <WrsPartPlanning part={9} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              <textarea 
                value={formData.passage} 
                onChange={e => updateField('passage', e.target.value)}
                className="w-full border border-stone-300 rounded-xl p-4 h-64 text-sm bg-stone-50 text-stone-900 focus:ring-2 focus:ring-red-800 outline-none font-serif leading-relaxed" 
                placeholder="Paste the reading passage here..."
              />
            </section>

            <section id="section-10" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-4">
                <Headphones className="w-5 h-5 text-red-800" />
                <label className="text-sm font-black text-stone-700 uppercase tracking-widest">Part 10: Listening Comprehension</label>
              </div>
              <WrsPartPlanning part={10} plan={formData.wrsPlan!} onChange={wrsPlan => setFormData(prev => ({ ...prev, wrsPlan }))} />
              <p className="text-[10px] text-stone-400 italic mb-4">Part 10 may remain teacher-selected at lesson time, or it can be fully planned here.</p>
            </section>

            <section className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <label className="block text-sm font-black text-stone-700 uppercase tracking-widest mb-3">Additional Lesson Planning Notes</label>
              <textarea value={formData.wrsPlan!.additionalNotes} onChange={e => setFormData(prev => ({ ...prev, wrsPlan: { ...prev.wrsPlan!, additionalNotes: e.target.value } }))} className="w-full border border-stone-300 rounded-xl p-4 h-40 text-sm bg-stone-50 text-stone-900 focus:ring-2 focus:ring-red-800 outline-none" />
            </section>

            <section id="section-cipher" className="bg-stone-900 p-8 rounded-[2.5rem] border-4 border-stone-800 text-white scroll-mt-24">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-amber-400" />
                  <h3 className="text-xl font-black font-serif uppercase tracking-widest">Cipher Game Configuration</h3>
                </div>
                <button type="button" onClick={() => setIsBulkCipherMode(!isBulkCipherMode)} className="text-[10px] font-black uppercase tracking-widest bg-stone-800 px-4 py-2 rounded-full hover:bg-stone-700 transition-all">
                  {isBulkCipherMode ? "Manual Builder" : "Bulk Import"}
                </button>
              </div>

              {isBulkCipherMode ? (
                <div className="space-y-4">
                  <textarea 
                    value={bulkCipherText}
                    onChange={e => setBulkCipherText(e.target.value)}
                    className="w-full bg-stone-950 border-2 border-stone-800 rounded-2xl p-6 font-mono text-sm text-amber-200 focus:border-amber-500 outline-none h-40"
                    placeholder="cat, dog, ship, /ang/, /sh/..."
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const words = bulkCipherText.split(',').map(s => s.trim()).filter(Boolean);
                      updateField('cipherWords', words);
                      setIsBulkCipherMode(false);
                    }}
                    className="w-full py-4 bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-amber-500 transition-all"
                  >
                    Process Cipher Deck
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 gap-8">
                      <div className="bg-stone-950/30 p-6 rounded-3xl border border-stone-800/50">
                        <div className="flex items-center gap-2 mb-4">
                          <Star className="w-4 h-4 text-amber-400" />
                          <label className="block text-xs font-black text-stone-400 uppercase tracking-widest">Smart Cipher Word Deck</label>
                        </div>
                        <CipherWordEntry 
                          words={formData.cipherWords || []} 
                          onUpdate={(words) => updateField('cipherWords', words)}
                          step={formData.step}
                          substep={formData.substep}
                        />
                        <p className="mt-4 text-[10px] text-stone-500 italic">Words are automatically analyzed based on Step {formData.step}.{formData.substep}. Sounds with multiple spelling options will be hidden for students to solve.</p>
                      </div>

                      <div className="bg-stone-950/30 p-6 rounded-3xl border border-stone-800/50">
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <label className="block text-xs font-black text-stone-400 uppercase tracking-widest">Manual Distractor Elements</label>
                        </div>
                        <SyllableBuilder type="cipher" value={formData.cipherDistractors?.join(' ') || ''} onChange={(val) => updateField('cipherDistractors', val.split(' ').filter(Boolean))} />
                        <p className="mt-4 text-[10px] text-stone-500 italic">Add extra tiles to the bank to increase difficulty (e.g. 'sh' vs 'ch').</p>
                      </div>
                   </div>
                </div>
              )}
            </section>

          </form>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50">
              <h3 className="text-lg font-black uppercase tracking-widest text-stone-800">Import Scroll Data</h3>
              <button onClick={() => { setShowImport(false); setImportError(''); }} className="text-stone-400 hover:text-stone-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-stone-500">Paste raw lesson text or a JSON export string.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-black uppercase tracking-widest bg-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-all flex items-center gap-2"
                >
                  <Upload className="w-3 h-3" /> Upload JSON
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        setImportText(content);
                        setImportError('');
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </div>
              <textarea 
                value={importText}
                onChange={e => { setImportText(e.target.value); setImportError(''); }}
                className="w-full h-64 p-4 border-2 border-stone-200 rounded-2xl font-mono text-sm text-stone-900 focus:border-red-800 outline-none mb-6"
                placeholder="Paste here..."
              />
              {importError ? <div role="alert" data-runtime-import-error className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950">{importError}</div> : null}
              <div className="flex gap-4">
                <button onClick={() => { setShowImport(false); setImportError(''); }} className="flex-1 py-4 border-2 border-stone-200 rounded-xl font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-50 transition-all">Cancel</button>
                <button onClick={handleImport} className="flex-1 py-4 bg-red-800 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-red-900 transition-all shadow-lg">Process Import</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonForm;
