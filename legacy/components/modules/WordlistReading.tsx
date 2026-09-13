import React, { useState } from 'react';
import { WordCard, StudentProfile, WordlistScore } from '../../types';
import { ArrowRight, ArrowLeft, RefreshCw, Scroll, User, Check, X } from 'lucide-react';
import { getWordlistStatus, toggleWordlistScore } from '../../lessonRules';
import { buildWordDistribution, normalizeWordDistribution, targetWordCount, WordInstance } from '../../wordDistribution';

interface WordlistReadingProps {
  cards: WordCard[];
  students: StudentProfile[];
  scores: WordlistScore[];
  onUpdateScores: (scores: WordlistScore[]) => void;
  isStudentView?: boolean;
  /** A runtime lesson supplied roster-bound lists; never substitute a shared reshuffle. */
  preassigned?: boolean;
  distribution: WordInstance[][];
  onUpdateDistribution: (dist: WordInstance[][]) => void;
  page: number;
  onUpdatePage: (page: number) => void;
}

const WordlistReading: React.FC<WordlistReadingProps> = ({ 
  cards, students = [], scores, onUpdateScores, isStudentView, preassigned = false,
  distribution = [], onUpdateDistribution, page = 0, onUpdatePage
}) => {
  const [teacherPlayerCount, setTeacherPlayerCount] = useState<number>(students.length > 0 ? students.length : 0);
  const safeDistribution = normalizeWordDistribution(distribution);
  const numPlayers = isStudentView
    ? (safeDistribution.length || students.length)
    : teacherPlayerCount;
  
  // Constants
  const WORDS_PER_PAGE = 5;
  
  const targetTotalWords = targetWordCount(cards);

  // Initialize or Reset Distribution
  const initializeDistribution = (count: number) => {
    if (isStudentView || preassigned || cards.length === 0) return;

    const newDistribution = buildWordDistribution(cards, count, targetTotalWords);

    onUpdateDistribution(newDistribution);
    onUpdatePage(0);
    // When re-shuffling, we clear scores to ensure a fresh session
    onUpdateScores([]); 
  };

  const handleStart = (n: number) => {
    if (isStudentView) return;
    setTeacherPlayerCount(n);
    initializeDistribution(n);
  };

  const nextPage = () => {
    const maxPages = Math.ceil(targetTotalWords / WORDS_PER_PAGE);
    if (page < maxPages - 1) {
      onUpdatePage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 0) {
      onUpdatePage(page - 1);
    }
  };

  const toggleStatus = (studentId: string, instanceId: string, wordText: string) => {
    if (!isStudentView) onUpdateScores(toggleWordlistScore(scores, studentId, instanceId, wordText));
  };

  const getFontSize = () => {
    if (numPlayers <= 2) return 'text-[clamp(1.5rem,4vw,3rem)]';
    if (numPlayers <= 4) return 'text-[clamp(1.2rem,2.5vw,2.5rem)]';
    return 'text-[clamp(1rem,1.5vw,1.5rem)]';
  };

  if (cards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-400 italic">
        <Scroll className="w-16 h-16 mb-4 opacity-20" />
        No words in this lesson to read.
      </div>
    );
  }

  const preassignedMismatch = preassigned && (
    safeDistribution.length !== students.length ||
    safeDistribution.some(studentList => studentList.length !== targetTotalWords)
  );

  if (preassignedMismatch) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-500 p-8 text-center">
        <Scroll className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="font-serif font-black text-xl text-stone-900">Part 4 lists are roster-bound</h2>
        <p className="max-w-lg mt-2">This runtime lesson has separate 15-word charting lists. Match the active roster to the named lesson lists before running Part 4; a shared reshuffle is intentionally unavailable.</p>
      </div>
    );
  }

  if (numPlayers === 0) {
    return (
      <div className="h-full flex flex-col bg-[#fcfbf9] font-sans items-center justify-center p-8">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-black text-stone-900 mb-2 italic">Wordlist Reading</h2>
            <p className="text-stone-400 uppercase tracking-widest text-[10px] font-black">How many students are reading today?</p>
         </div>
         
         <div className="grid grid-cols-3 gap-6 mb-8">
           {[1, 2, 3, 4, 5, 6].map(n => (
             <button 
               key={n}
               onClick={() => handleStart(n)}
               className="w-24 h-24 bg-white border border-stone-100 hover:border-red-600 hover:text-red-600 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm hover:shadow-xl group"
             >
               <User className="w-8 h-8 text-stone-200 group-hover:text-red-500 transition-colors" />
               <span className="font-black text-2xl text-stone-300 group-hover:text-red-800 transition-colors">{n}</span>
             </button>
           ))}
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-[#fcfbf9] font-sans text-stone-900">
      <div className="h-20 bg-white border-b border-stone-100 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
        <div className={`flex items-center gap-4 ${isStudentView ? 'mx-auto' : ''}`}>
          <h2 className="text-xl font-bold text-stone-900 font-serif uppercase tracking-wider hidden md:block">
            Wordlist Reading
          </h2>
          <div className="flex gap-1">
             {Array.from({ length: Math.ceil(targetTotalWords / WORDS_PER_PAGE) }).map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${page === i ? 'bg-red-800' : 'bg-stone-50'}`} />
             ))}
          </div>
        </div>

        {!isStudentView && !preassigned && <div className="flex items-center gap-4">
           <button onClick={() => setTeacherPlayerCount(0)} className="text-[10px] text-stone-400 hover:text-stone-900 uppercase font-black tracking-widest mr-4">
             Reset Party
           </button>
           
           <div className="flex bg-stone-50 p-1 rounded-xl border border-stone-100">
             <button 
               onClick={prevPage} 
               disabled={page === 0}
               aria-label="Previous word page"
               className="p-3 text-stone-300 hover:text-stone-900 disabled:opacity-20 transition-colors"
             >
               <ArrowLeft className="w-6 h-6" />
             </button>
             <div className="w-px h-8 bg-stone-100 mx-1 self-center"></div>
             <button 
               onClick={nextPage}
               disabled={page >= Math.ceil(targetTotalWords / WORDS_PER_PAGE) - 1} 
               aria-label="Next word page"
               className="p-3 text-stone-300 hover:text-stone-900 disabled:opacity-20 transition-colors"
             >
               <ArrowRight className="w-6 h-6" />
             </button>
           </div>
           
           <button 
             onClick={() => initializeDistribution(numPlayers)} 
             className="p-3 bg-white text-stone-300 hover:text-stone-900 rounded-xl border border-stone-100 shadow-sm"
             title="Reshuffle Words"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
        </div>}
      </div>

      <div className="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]">
        <div className="h-full w-full flex divide-x-2 divide-stone-300/50">
          
          {safeDistribution.map((studentList, sIdx) => {
            const start = page * WORDS_PER_PAGE;
            const currentWords = studentList.slice(start, start + WORDS_PER_PAGE);
            const student = (students && students[sIdx]) ? students[sIdx] : { id: `student-${sIdx}`, name: `Student ${sIdx + 1}` };

            return (
              <div key={sIdx} className="flex-1 flex flex-col min-w-0">
                <div className="py-4 bg-white border-b border-stone-100 text-center shadow-sm">
                  <span className="font-black font-serif text-stone-900 uppercase tracking-widest text-xs px-2 truncate block">
                    {student.name}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-evenly p-4 items-center">
                  {currentWords.map((card, wIdx) => {
                    const status = getWordlistStatus(scores, student.id, card.instanceId);
                    return (
                      <div 
                        key={card.instanceId} 
                        onClick={() => toggleStatus(student.id, card.instanceId, card.text)}
                        role={isStudentView ? undefined : 'button'}
                        tabIndex={isStudentView ? undefined : 0}
                        onKeyDown={(event) => {
                          if (!isStudentView && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            toggleStatus(student.id, card.instanceId, card.text);
                          }
                        }}
                        aria-label={isStudentView ? undefined : `${student.name}: ${card.text}, ${status}`}
                        className={`
                          w-full text-center py-6 px-2 border-b border-stone-50 last:border-0 transition-all relative group
                          ${isStudentView ? 'cursor-default' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-700'}
                          ${!isStudentView && status === 'correct' ? 'bg-emerald-50/50' : !isStudentView && status === 'error' ? 'bg-red-50/50' : 'hover:bg-stone-50'}
                        `}
                      >
                        <span className={`
                          font-bold font-serif ${getFontSize()} leading-tight block break-words
                          ${!isStudentView && status === 'correct' ? 'text-emerald-700' : !isStudentView && status === 'error' ? 'text-red-700' : isStudentView ? 'text-stone-900' : 'text-stone-400'}
                        `}>
                          {card.text}
                        </span>
                        
                        {!isStudentView && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
                             {status === 'none' && <Check className="w-5 h-5 text-stone-200" />}
                             {status === 'correct' && <Check className="w-5 h-5 text-emerald-600" />}
                             {status === 'error' && <X className="w-5 h-5 text-red-600" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {currentWords.length < WORDS_PER_PAGE && Array.from({ length: WORDS_PER_PAGE - currentWords.length }).map((_, i) => (
                     <div key={`empty-${i}`} className="flex-1" />
                  ))}
                </div>
              </div>
            );
          })}

        </div>
      </div>
      
      {/* Legend */}
      {!isStudentView && <div className="bg-white p-3 border-t border-stone-100 flex justify-center gap-8">
         <div className="flex items-center gap-2 text-[9px] font-black uppercase text-stone-300 tracking-wider">
            <div className="w-2.5 h-2.5 bg-emerald-50 border border-emerald-100 rounded-sm"></div> Correct
         </div>
         <div className="flex items-center gap-2 text-[9px] font-black uppercase text-stone-300 tracking-wider">
            <div className="w-2.5 h-2.5 bg-red-50 border border-red-100 rounded-sm"></div> Error
         </div>
         <div className="flex items-center gap-2 text-[9px] font-black uppercase text-stone-300 tracking-wider">
            <div className="w-2.5 h-2.5 bg-white border border-stone-100 rounded-sm"></div> Clear
         </div>
      </div>}
    </div>
  );
};

export default WordlistReading;
