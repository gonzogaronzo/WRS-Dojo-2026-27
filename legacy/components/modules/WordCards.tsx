import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WordCard } from '../../types';
import { WordCardsSessionState } from '../../useLessonSession';
import {
  bankWordCardsTurn,
  buildWordCardsDeck,
  dealWordCard,
  resetWordCardsState
} from '../../wordCardsState';
import { useLessonRuntime } from '../lessonRuntimeContext';

interface WordCardsProps {
  cards: WordCard[];
  hfw?: string[];
  students?: string[];
  state?: WordCardsSessionState;
  onUpdateState?: (value: WordCardsSessionState | ((previous: WordCardsSessionState) => WordCardsSessionState)) => void;
  readOnly?: boolean;
}

const fallbackState: WordCardsSessionState = {
  deck: [], currentIndex: -1, filter: 'all', mode: 'standard', scores: [],
  currentPlayerIndex: 0, turnScore: 0, isBust: false
};

const WordCards: React.FC<WordCardsProps> = ({
  cards,
  hfw = [],
  students = [],
  state: syncedState,
  onUpdateState,
  readOnly = false
}) => {
  const lesson = useLessonRuntime();
  const [localState, setLocalState] = useState<WordCardsSessionState>(fallbackState);
  const state = syncedState || localState;
  const updateState = (value: WordCardsSessionState | ((previous: WordCardsSessionState) => WordCardsSessionState)) => {
    if (readOnly) return;
    if (onUpdateState) onUpdateState(value);
    else setLocalState(value);
  };

  const wordElements = useMemo(() => {
    const part3 = lesson?.runtimePlan?.parts?.find(part => part.part === 3);
    return Array.isArray(part3?.data?.wordElements)
      ? part3.data.wordElements.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  }, [lesson?.runtimePlan]);

  const validCards = (cards || []).filter((card): card is WordCard => Boolean(card?.id));
  const cardsKey = validCards.map(card => card.id).join('|');
  const hfwKey = hfw.join('|');
  const studentsKey = students.join('|');
  const wordElementsKey = wordElements.join('|');
  const elementsActive = state.deck.length > 0 && state.deck.every(card => card.id.startsWith('word-element-'));

  useEffect(() => {
    if (readOnly || elementsActive) return;
    const deck = buildWordCardsDeck(validCards, hfw, state.filter, state.mode);
    updateState(previous => resetWordCardsState(previous, deck, students.length));
  }, [cardsKey, hfwKey, studentsKey, state.filter, state.mode, readOnly]);

  const currentCard = state.currentIndex >= 0 && state.currentIndex < state.deck.length
    ? state.deck[state.currentIndex]
    : null;
  const isDone = state.currentIndex >= state.deck.length && state.deck.length > 0;
  const playerCount = Math.max(1, students.length);
  const playerName = (index: number) => students[index] || `Player ${index + 1}`;

  const rebuildDeck = () => {
    const deck = elementsActive
      ? wordElements.map((text, index) => ({ id: `word-element-${index}-${text}`, text, type: 'regular' as const }))
      : buildWordCardsDeck(validCards, hfw, state.filter, state.mode);
    updateState(previous => resetWordCardsState(previous, deck, students.length));
  };

  const chooseStandardFilter = (filter: WordCardsSessionState['filter']) => {
    updateState(previous => ({ ...previous, filter, deck: [] }));
  };

  const chooseWordElements = () => {
    const deck: WordCard[] = wordElements.map((text, index) => ({
      id: `word-element-${index}-${text}`,
      text,
      type: 'regular'
    }));
    updateState(previous => resetWordCardsState(previous, deck, students.length));
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-stone-900 font-sans text-stone-100">
      <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="pointer-events-none absolute left-0 top-0 z-20 flex w-full items-start justify-between p-6">
        {!readOnly && (
          <div className="pointer-events-auto flex flex-col gap-4">
            <div className="flex w-max items-center rounded-xl border border-stone-700 bg-stone-800 p-1 shadow-xl">
              <button onClick={() => updateState(previous => ({ ...previous, mode: 'standard' }))} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider ${state.mode === 'standard' ? 'bg-blue-600 text-white' : 'text-stone-400'}`}>Standard</button>
              <button onClick={() => updateState(previous => ({ ...previous, mode: 'oops' }))} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider ${state.mode === 'oops' ? 'bg-amber-600 text-white' : 'text-stone-400'}`}>Oops!</button>
            </div>
            <div className="flex w-max items-center rounded-xl border border-stone-700 bg-stone-800 p-1 shadow-xl">
              {(['all', 'regular', 'hfw'] as const).map(filter => (
                <button key={filter} onClick={() => chooseStandardFilter(filter)} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider ${!elementsActive && state.filter === filter ? 'bg-stone-600 text-white' : 'text-stone-400'}`}>
                  {filter === 'all' ? 'Both' : filter === 'hfw' ? 'Sight' : 'Regular'}
                </button>
              ))}
              {wordElements.length > 0 && (
                <button
                  onClick={chooseWordElements}
                  className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider ${elementsActive ? 'bg-stone-600 text-white' : 'text-stone-400'}`}
                >
                  Word Elements
                </button>
              )}
            </div>
          </div>
        )}

        {state.mode === 'oops' && (
          <div className="flex flex-col gap-2">
            {state.scores.map((score, index) => (
              <div key={index} className={`flex min-w-[200px] items-center justify-between rounded-xl border-2 px-4 py-2 shadow-lg ${index === state.currentPlayerIndex ? 'scale-105 border-amber-500 bg-stone-800' : 'border-stone-700 bg-stone-800/50'}`}>
                <span className={`font-bold ${index === state.currentPlayerIndex ? 'text-amber-400' : 'text-stone-400'}`}>{playerName(index)}</span>
                <span className={`text-xl font-black ${index === state.currentPlayerIndex ? 'text-white' : 'text-stone-500'}`}>{score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-24 flex w-full flex-1 flex-col items-center justify-center p-8">
        {state.deck.length === 0 ? (
          <div className="text-xl font-medium text-stone-500">Preparing the shared deck…</div>
        ) : isDone ? (
          <div className="flex h-full flex-col items-center justify-center gap-8">
            <h2 className="text-5xl font-black uppercase tracking-widest text-amber-500">Deck Empty!</h2>
            {state.mode === 'oops' && state.scores.map((score, index) => <div key={index} className="text-2xl font-black">{playerName(index)}: <span className="text-amber-500">{score} PT</span></div>)}
            {!readOnly && <button onClick={rebuildDeck} className="rounded-2xl bg-amber-600 px-8 py-4 text-xl font-black uppercase tracking-[0.2em] text-white">Shuffle & Restart</button>}
          </div>
        ) : (
          <div className="perspective-[1000px] relative flex aspect-[3/4] max-h-[50vh] w-full max-w-sm items-center justify-center">
            <AnimatePresence mode="wait">
              {currentCard ? (
                <motion.div
                  key={currentCard.id}
                  initial={{ rotateY: 90, scale: 0.8, opacity: 0 }}
                  animate={{ rotateY: 0, scale: 1, opacity: 1, y: state.isBust ? 20 : 0 }}
                  exit={{ rotateY: -90, scale: 0.8, opacity: 0 }}
                  className={`absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-[2rem] border-4 p-6 shadow-2xl ${currentCard.id.startsWith('word-element-') ? 'border-stone-400 bg-stone-300 text-stone-900' : currentCard.type === 'nonsense' ? 'border-purple-500 bg-purple-900 text-purple-100' : currentCard.type === 'hfw' ? 'border-red-500 bg-red-900 text-red-100' : currentCard.type === 'oops' ? 'border-orange-400 bg-orange-600 text-white' : 'border-stone-300 bg-stone-100 text-stone-900'}`}
                >
                  <span className={`${currentCard.text.length > 8 ? 'text-4xl sm:text-5xl md:text-6xl' : 'text-5xl sm:text-6xl md:text-7xl'} text-center font-black leading-none`}>{currentCard.text}</span>
                  {currentCard.id.startsWith('word-element-') && <span className="absolute right-6 top-4 text-sm font-bold uppercase tracking-widest text-stone-600">Word Element</span>}
                  {currentCard.type === 'nonsense' && <span className="absolute right-6 top-4 text-sm font-bold uppercase tracking-widest text-purple-300">Nonsense</span>}
                  {currentCard.type === 'hfw' && <span className="absolute right-6 top-4 text-sm font-bold uppercase tracking-widest text-red-300">Heart Word</span>}
                  {currentCard.type === 'oops' && <span className="absolute right-6 top-4 text-sm font-black uppercase tracking-widest text-orange-200">Bust!</span>}
                </motion.div>
              ) : (
                <motion.div key="deck-back" className="absolute inset-0 flex h-full w-full items-center justify-center rounded-[2rem] border-4 border-stone-600 bg-stone-800 shadow-2xl">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-stone-600 opacity-50"><div className="h-16 w-16 rounded-full border-4 border-stone-600" /></div>
                  <div className="absolute right-6 top-4 text-sm font-bold uppercase tracking-widest text-stone-500">WRS Deck</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!readOnly && state.deck.length > 0 && !isDone && (
        <div className="relative z-20 flex w-full items-center justify-center gap-6 border-t border-stone-800 bg-stone-950/80 p-6">
          <button onClick={() => updateState(previous => dealWordCard(previous, playerCount))} className={`rounded-[2rem] px-12 py-5 text-2xl font-black uppercase tracking-[0.3em] text-white ${state.isBust ? 'bg-stone-600' : 'bg-blue-600'}`}>
            {state.isBust ? 'Next Turn' : state.currentIndex === -1 ? 'Start' : 'Deal'}
          </button>
          {state.mode === 'oops' && state.currentIndex >= 0 && !state.isBust && (
            <button onClick={() => updateState(previous => bankWordCardsTurn(previous, playerCount))} className="rounded-[2rem] bg-stone-800 px-8 py-5 font-bold uppercase tracking-widest text-stone-200">Bank {state.turnScore} & Pass</button>
          )}
          <div className="absolute right-8 text-sm font-bold uppercase tracking-widest text-stone-400">{state.currentIndex >= 0 ? `${Math.min(state.currentIndex + 1, state.deck.length)} / ${state.deck.length}` : `${state.deck.length} Cards`}</div>
        </div>
      )}
    </div>
  );
};

export default WordCards;
