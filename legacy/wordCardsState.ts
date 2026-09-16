import { WordCard } from './types';
import { WordCardsFilter, WordCardsMode, WordCardsSessionState } from './useLessonSession';

export const buildWordCardsDeck = (
  cards: WordCard[],
  hfw: string[] = [],
  filter: WordCardsFilter | 'word-elements' = 'all',
  mode: WordCardsMode = 'standard',
  random: () => number = Math.random,
  wordElements: string[] = []
): WordCard[] => {
  const regular = (cards || []).filter((card): card is WordCard => Boolean(card?.id));
  const elements: WordCard[] = (wordElements || []).map((element, index) => ({
    id: `word-element-${index}-${element}`,
    text: element,
    type: 'regular' as const
  }));

  let pool: WordCard[] = [];
  if (filter === 'all' || filter === 'regular') pool.push(...regular);
  if (filter === 'all' || filter === 'hfw') {
    pool.push(...(hfw || []).map((word, index) => ({ id: `hfw-${index}`, text: word, type: 'hfw' as const })));
  }
  if (filter === 'word-elements') pool.push(...elements);

  if (mode === 'oops') {
    const count = Math.max(3, Math.floor(pool.length / 6));
    for (let index = 0; index < count; index += 1) {
      pool.push({ id: `oops-${index}`, text: 'OOPS!', type: 'oops' });
    }
  }

  pool = [...pool];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool;
};

export const resetWordCardsState = (
  state: WordCardsSessionState,
  deck: WordCard[],
  playerCount: number
): WordCardsSessionState => ({
  ...state,
  deck,
  currentIndex: -1,
  scores: new Array(Math.max(1, playerCount)).fill(0),
  currentPlayerIndex: 0,
  turnScore: 0,
  isBust: false
});

export const bankWordCardsTurn = (
  state: WordCardsSessionState,
  playerCount: number
): WordCardsSessionState => {
  const scores = [...state.scores];
  while (scores.length < Math.max(1, playerCount)) scores.push(0);
  scores[state.currentPlayerIndex] = (scores[state.currentPlayerIndex] || 0) + state.turnScore;
  return {
    ...state,
    scores,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % Math.max(1, playerCount),
    turnScore: 0,
    isBust: false
  };
};

export const dealWordCard = (
  state: WordCardsSessionState,
  playerCount: number
): WordCardsSessionState => {
  if (state.isBust) return bankWordCardsTurn(state, playerCount);
  if (!state.deck.length || state.currentIndex >= state.deck.length) return state;
  if (state.currentIndex >= state.deck.length - 1) return { ...state, currentIndex: state.deck.length };
  const currentIndex = state.currentIndex + 1;
  const card = state.deck[currentIndex];
  if (state.mode !== 'oops') return { ...state, currentIndex };
  if (card?.type === 'oops') return { ...state, currentIndex, isBust: true, turnScore: 0 };
  return { ...state, currentIndex, turnScore: state.turnScore + 1 };
};
