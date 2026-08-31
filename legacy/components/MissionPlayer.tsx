
import React, { useState, useEffect, useRef } from 'react';
import { Lesson, WordCard, StudentProfile, WordlistScore } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, CheckCircle2, XCircle, ChevronRight, 
  ChevronLeft, Flag, Trophy, Shield, Zap,
  Play, Pause, RotateCcw
} from 'lucide-react';

interface MissionPlayerProps {
  lesson: Lesson;
  students: StudentProfile[];
  onComplete: (scores: WordlistScore[]) => void;
  onExit: () => void;
}

const MissionPlayer: React.FC<MissionPlayerProps> = ({ lesson, students, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<WordlistScore[]>([]);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cards = (lesson.wordCards || []).filter((card): card is WordCard => Boolean(card?.id));
  const validStudents = (students || []).filter((student): student is StudentProfile => Boolean(student?.id));
  const currentCard = cards[currentIndex];
  const currentStudent = validStudents[currentStudentIndex];

  useEffect(() => {
    if (isActive && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isFinished, startTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleScore = (status: 'correct' | 'error') => {
    if (!currentCard || !currentStudent) return;

    const newScore: any = {
      studentId: currentStudent.id,
      instanceId: currentCard.id,
      wordText: currentCard.text,
      status,
      timestamp: Date.now()
    };

    setScores(prev => [...prev.filter(s => !(s.studentId === currentStudent.id && (s as any).instanceId === currentCard.id)), newScore]);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Rotate students if multiple are present
      if (validStudents.length > 1) {
        setCurrentStudentIndex(prev => (prev + 1) % validStudents.length);
      }
    } else {
      setIsFinished(true);
    }
  };

  const progress = ((currentIndex + 1) / cards.length) * 100;

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-[100] bg-stone-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-stone-900 border-4 border-red-800 rounded-[3rem] p-10 text-center shadow-2xl"
        >
          <div className="w-24 h-24 bg-red-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(153,27,27,0.4)]">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-black font-serif uppercase tracking-widest text-white mb-2">Mission Sealed</h2>
          <p className="text-stone-400 text-sm uppercase tracking-widest mb-8">Training Session Concluded</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-stone-800 p-4 rounded-2xl border border-stone-700">
              <div className="text-[10px] font-black text-stone-500 uppercase mb-1">Duration</div>
              <div className="text-2xl font-black text-white">{formatTime(elapsed)}</div>
            </div>
            <div className="bg-stone-800 p-4 rounded-2xl border border-stone-700">
              <div className="text-[10px] font-black text-stone-500 uppercase mb-1">Accuracy</div>
              <div className="text-2xl font-black text-emerald-400">
                {Math.round((scores.filter(s => s.status === 'correct').length / scores.length) * 100) || 0}%
              </div>
            </div>
          </div>

          <button 
            onClick={() => onComplete(scores)}
            className="w-full py-4 bg-white text-stone-950 rounded-2xl font-black uppercase tracking-widest hover:bg-stone-200 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
          >
            Review Dossier <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between border-b-2 border-stone-900 bg-stone-950/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-red-800 p-2 rounded-lg shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black uppercase tracking-widest text-sm">{lesson.title}</h1>
            <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">Step {lesson.step}.{lesson.substep}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-stone-900 px-4 py-2 rounded-full border border-stone-800">
            <Timer className="w-4 h-4 text-red-500" />
            <span className="text-white font-mono font-bold text-lg">{formatTime(elapsed)}</span>
          </div>
          <button 
            onClick={onExit}
            className="text-stone-500 hover:text-white transition-colors p-2"
          >
            <Flag className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-stone-900">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Background Accents */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40rem] font-black text-white select-none">
            {currentIndex + 1}
          </div>
        </div>

        {/* Current Ninja */}
        {currentStudent && (
          <motion.div 
            key={currentStudent.id}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8 flex items-center gap-3 bg-stone-900/50 px-6 py-2 rounded-full border border-stone-800"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Active Student:</span>
            <span className="text-white font-black uppercase tracking-widest text-xs">{currentStudent.name}</span>
          </motion.div>
        )}

        {/* Card Display */}
        <div className="w-full max-w-5xl flex-1 min-h-0 flex items-center justify-center relative perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard?.id || 'empty'}
              initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: -90, opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              className={`w-full h-full max-h-[60vh] rounded-[2rem] md:rounded-[4rem] border-[6px] md:border-[12px] shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex items-center justify-center p-6 md:p-12 relative overflow-hidden ${
                currentCard?.type === 'hfw' ? 'bg-[#fff5f5] border-red-200' : 'bg-white border-stone-200'
              }`}
            >
              {currentCard?.type === 'hfw' && (
                <div className="absolute top-4 left-4 md:top-8 md:left-8">
                  <Zap className="w-6 h-6 md:w-12 md:h-12 text-red-300" />
                </div>
              )}
              
              <span className={`text-[15vh] md:text-[20vh] lg:text-[25vh] font-black font-sans tracking-tighter text-center leading-none select-none ${
                currentCard?.type === 'hfw' ? 'text-red-600' : 'text-stone-950'
              }`}>
                {currentCard?.text}
              </span>

              <div className="absolute bottom-4 right-6 md:bottom-8 md:right-12 text-stone-300 font-black italic text-lg md:text-2xl">
                {currentIndex + 1} / {cards.length}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-8 md:mt-16 flex items-center gap-4 md:gap-8 shrink-0">
          <button 
            onClick={() => handleScore('error')}
            className="group flex flex-col items-center gap-2 md:gap-3"
          >
            <div className="w-16 h-16 md:w-24 md:h-24 bg-stone-900 border-2 md:border-4 border-stone-800 rounded-full flex items-center justify-center text-stone-600 group-hover:bg-red-950 group-hover:border-red-800 group-hover:text-red-500 transition-all shadow-xl active:scale-95">
              <XCircle className="w-8 h-8 md:w-12 md:h-12" />
            </div>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-600 group-hover:text-red-500">Strike</span>
          </button>

          <div className="w-px h-12 md:h-16 bg-stone-800" />

          <button 
            onClick={() => handleScore('correct')}
            className="group flex flex-col items-center gap-2 md:gap-3"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 bg-red-800 border-2 md:border-4 border-red-700 rounded-full flex items-center justify-center text-white group-hover:bg-red-700 group-hover:scale-105 transition-all shadow-[0_20px_40px_rgba(153,27,27,0.3)] active:scale-95">
              <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-red-500">Mastered</span>
          </button>

          <div className="w-px h-12 md:h-16 bg-stone-800" />

          <button 
            onClick={() => setCurrentIndex(prev => Math.min(cards.length - 1, prev + 1))}
            className="group flex flex-col items-center gap-2 md:gap-3"
          >
            <div className="w-16 h-16 md:w-24 md:h-24 bg-stone-900 border-2 md:border-4 border-stone-800 rounded-full flex items-center justify-center text-stone-600 group-hover:bg-stone-800 group-hover:text-white transition-all shadow-xl active:scale-95">
              <ChevronRight className="w-8 h-8 md:w-12 md:h-12" />
            </div>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-600 group-hover:text-white">Skip</span>
          </button>
        </div>
      </div>

      {/* Footer / Navigation */}
      <div className="px-8 py-6 bg-stone-900/30 border-t border-stone-900 flex justify-center gap-4">
        <button 
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="p-3 text-stone-500 hover:text-white disabled:opacity-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex gap-2">
          {cards.map((_, i) => (
            <div 
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'bg-red-600 w-4' : 
                scores.some(s => (s as any).instanceId === cards[i].id) ? 'bg-stone-600' : 'bg-stone-800'
              }`}
            />
          ))}
        </div>

        <button 
          onClick={() => setCurrentIndex(prev => Math.min(cards.length - 1, prev + 1))}
          disabled={currentIndex === cards.length - 1}
          className="p-3 text-stone-500 hover:text-white disabled:opacity-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default MissionPlayer;
