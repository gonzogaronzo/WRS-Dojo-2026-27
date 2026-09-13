import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpenCheck, Dices, Eye, EyeOff, FlipHorizontal2,
  Grid3X3, Layers3, ListFilter, Search, Shuffle, Sparkles
} from 'lucide-react';
import { auth } from '../firebase';
import { GroupProfile } from '../types';
import {
  WORD_ELEMENT_ATLAS,
  WORD_ELEMENT_REVIEW_CARDS,
  WORD_ELEMENT_REVIEW_SOURCE_NOTE,
  WORD_ELEMENT_REVIEW_SUBSTEPS,
  WordElementFamily,
  WordElementReviewCard,
  cardElementLabel,
  cardsForWordElementReview
} from '../wordElementReviewDeck';

type ReviewScope = 'all' | 'through' | 'current';
type PromptMode = 'element' | 'meaning' | 'picture';
type DeckView = 'study' | 'browse';

interface WordElementReviewDeckProps {
  activeGroup: GroupProfile | null;
}

const buttonBase = 'rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all';

const MnemonicSprite: React.FC<{
  card: WordElementReviewCard;
  atlasUrl: string | null;
  className?: string;
}> = ({ card, atlasUrl, className = '' }) => {
  if (!atlasUrl) {
    return (
      <div className={`flex aspect-square items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-center text-[9px] font-black uppercase tracking-widest text-stone-400 ${className}`}>
        Mnemonic image unavailable
      </div>
    );
  }

  const x = WORD_ELEMENT_ATLAS.cols <= 1 ? 0 : (card.atlasCol * 100) / (WORD_ELEMENT_ATLAS.cols - 1);
  const y = WORD_ELEMENT_ATLAS.rows <= 1 ? 0 : (card.atlasRow * 100) / (WORD_ELEMENT_ATLAS.rows - 1);
  return (
    <div
      role="img"
      aria-label={`Wilson notebook mnemonic illustration for ${cardElementLabel(card)}`}
      className={`aspect-square bg-contain bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${atlasUrl})`,
        backgroundSize: `${WORD_ELEMENT_ATLAS.cols * 100}% ${WORD_ELEMENT_ATLAS.rows * 100}%`,
        backgroundPosition: `${x}% ${y}%`
      }}
    />
  );
};

const WordElementReviewDeck: React.FC<WordElementReviewDeckProps> = ({ activeGroup }) => {
  const groupSubstep = activeGroup?.instructionalProfile?.currentSubstep?.trim() || '';
  const [family, setFamily] = useState<WordElementFamily | 'All'>('All');
  const [scope, setScope] = useState<ReviewScope>(groupSubstep ? 'through' : 'all');
  const [targetSubstep, setTargetSubstep] = useState(groupSubstep || '7.3');
  const [promptMode, setPromptMode] = useState<PromptMode>('element');
  const [view, setView] = useState<DeckView>('study');
  const [teacherInfo, setTeacherInfo] = useState(false);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<string[]>(WORD_ELEMENT_REVIEW_CARDS.map(card => card.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [atlasUrl, setAtlasUrl] = useState<string | null>(null);
  const [atlasState, setAtlasState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!groupSubstep) return;
    setTargetSubstep(groupSubstep);
    setScope('through');
    setIndex(0);
    setFlipped(false);
  }, [groupSubstep]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async (forceRefresh = false): Promise<void> => {
      const user = auth.currentUser;
      if (!user) {
        setAtlasState('error');
        return;
      }
      const token = await user.getIdToken(forceRefresh);
      const response = await fetch(WORD_ELEMENT_ATLAS.endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (response.status === 401 && !forceRefresh) return load(true);
      if (!response.ok) throw new Error(`Mnemonic atlas request failed (${response.status})`);
      const blob = await response.blob();
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setAtlasUrl(objectUrl);
      setAtlasState('ready');
    };

    setAtlasState('loading');
    load().catch(error => {
      console.error('Unable to load authenticated word-element mnemonic atlas', error);
      if (!cancelled) setAtlasState('error');
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const availableSubsteps = useMemo(() => {
    const values = new Set(WORD_ELEMENT_REVIEW_SUBSTEPS);
    if (groupSubstep) values.add(groupSubstep);
    return Array.from(values).sort((a, b) => {
      const [as, ab = '0'] = a.split('.');
      const [bs, bb = '0'] = b.split('.');
      return Number(as) * 100 + Number(ab) - (Number(bs) * 100 + Number(bb));
    });
  }, [groupSubstep]);

  const filteredSourceCards = useMemo(() => cardsForWordElementReview({ family, scope, targetSubstep }), [family, scope, targetSubstep]);
  const cards = useMemo(() => {
    const byId = new Map(filteredSourceCards.map(card => [card.id, card]));
    return order.map(id => byId.get(id)).filter((card): card is WordElementReviewCard => Boolean(card));
  }, [filteredSourceCards, order]);

  useEffect(() => {
    setIndex(current => Math.min(current, Math.max(0, cards.length - 1)));
    setFlipped(false);
  }, [cards.length, family, scope, targetSubstep]);

  const current = cards[index] || null;
  const browseCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(card => [
      cardElementLabel(card), card.meaning, card.example, card.related.join(' '), card.firstTaught
    ].join(' ').toLowerCase().includes(q));
  }, [cards, search]);

  const move = (delta: number) => {
    if (!cards.length) return;
    setIndex(currentIndex => (currentIndex + delta + cards.length) % cards.length);
    setFlipped(false);
  };

  const shuffle = () => {
    setOrder(previous => {
      const eligible = new Set(filteredSourceCards.map(card => card.id));
      const selected = previous.filter(id => eligible.has(id));
      for (let i = selected.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
      }
      const unselected = previous.filter(id => !eligible.has(id));
      return [...selected, ...unselected];
    });
    setIndex(0);
    setFlipped(false);
  };

  const random = () => {
    if (!cards.length) return;
    setIndex(Math.floor(Math.random() * cards.length));
    setFlipped(false);
  };

  const resetOrder = () => {
    setOrder(WORD_ELEMENT_REVIEW_CARDS.map(card => card.id));
    setIndex(0);
    setFlipped(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'ArrowLeft') move(-1);
      if ((event.key === ' ' || event.key === 'Enter') && view === 'study') {
        event.preventDefault();
        setFlipped(value => !value);
      }
      if (event.key.toLowerCase() === 's') shuffle();
      if (event.key.toLowerCase() === 'r') random();
      if (event.key.toLowerCase() === 't') setTeacherInfo(value => !value);
      if (event.key.toLowerCase() === 'b') setView(value => value === 'browse' ? 'study' : 'browse');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const scopeLabel = scope === 'all'
    ? 'All illustrated word elements'
    : scope === 'current'
      ? `Introduced at ${targetSubstep}`
      : `Cumulative through ${targetSubstep}`;

  return (
    <section className="space-y-5" aria-label="Word Element Review">
      <div className="rounded-3xl border border-stone-200 bg-[#f7f1e3] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-stone-500">
              <Layers3 className="h-4 w-4 text-red-800" /> Word Element Review
            </div>
            <h2 className="font-serif text-2xl font-black text-stone-950">Latin Bases + Greek Combining Forms</h2>
            <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-stone-600">
              {activeGroup?.name ? `${activeGroup.name}: ${scopeLabel}. ` : ''}
              Mnemonic illustrations come from the supplied Wilson Student Notebook Answer Key; the review deck itself is teacher-created.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setView('study')} className={`${buttonBase} ${view === 'study' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-500 hover:text-stone-900'}`}>
              <FlipHorizontal2 className="mr-1 inline h-3.5 w-3.5" /> Study
            </button>
            <button type="button" onClick={() => setView('browse')} className={`${buttonBase} ${view === 'browse' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-500 hover:text-stone-900'}`}>
              <Grid3X3 className="mr-1 inline h-3.5 w-3.5" /> Browse
            </button>
            <button type="button" onClick={() => setTeacherInfo(value => !value)} className={`${buttonBase} ${teacherInfo ? 'border-red-800 bg-red-800 text-white' : 'border-stone-200 bg-white text-stone-500 hover:text-stone-900'}`}>
              {teacherInfo ? <EyeOff className="mr-1 inline h-3.5 w-3.5" /> : <Eye className="mr-1 inline h-3.5 w-3.5" />}
              Teacher info {teacherInfo ? 'on' : 'off'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-stone-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1"><span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Family</span><select value={family} onChange={event => setFamily(event.target.value as WordElementFamily | 'All')} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-black text-stone-800 outline-none focus:border-red-800"><option value="All">Latin + Greek</option><option value="Latin">Latin only</option><option value="Greek">Greek only</option></select></label>
          <label className="space-y-1"><span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Scope</span><select value={scope} onChange={event => setScope(event.target.value as ReviewScope)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-black text-stone-800 outline-none focus:border-red-800"><option value="all">All illustrated</option><option value="through">Cumulative through</option><option value="current">Current Substep only</option></select></label>
          <label className="space-y-1"><span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Substep</span><select disabled={scope === 'all'} value={targetSubstep} onChange={event => setTargetSubstep(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-black text-stone-800 outline-none disabled:cursor-not-allowed disabled:opacity-40 focus:border-red-800">{availableSubsteps.map(substep => <option key={substep} value={substep}>{substep}{substep === groupSubstep ? ' • group' : ''}</option>)}</select></label>
          <label className="space-y-1"><span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Prompt</span><select value={promptMode} onChange={event => setPromptMode(event.target.value as PromptMode)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-black text-stone-800 outline-none focus:border-red-800"><option value="element">Element → meaning</option><option value="meaning">Meaning → element</option><option value="picture">Picture → element</option></select></label>
        </div>
      </div>

      {atlasState === 'error' && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] font-bold text-amber-900">The protected mnemonic-image service is unavailable in this build. Text review still works; picture prompts remain unavailable until the authenticated asset endpoint is deployed.</div>}

      {view === 'study' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
            {!current ? <div className="flex min-h-[420px] items-center justify-center text-center text-sm font-bold text-stone-400">No illustrated cards match these filters.</div> : <>
              <button type="button" onClick={() => setFlipped(value => !value)} className="block w-full text-left" aria-label="Flip review card">
                <div className={`relative min-h-[430px] overflow-hidden rounded-[1.75rem] border-2 transition-colors ${flipped ? 'border-red-800 bg-[#faf6eb]' : 'border-stone-200 bg-[#fcfbf8]'}`}>
                  {!flipped ? <div className="flex min-h-[430px] flex-col items-center justify-center p-8 text-center">
                    <p className="mb-6 text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">{promptMode === 'element' ? (current.family === 'Latin' ? 'What does this Latin base mean?' : 'What does this Greek combining form mean?') : promptMode === 'meaning' ? 'Which word element matches this meaning?' : 'Which word element does this picture cue?'}</p>
                    {promptMode === 'element' && <div className="font-serif text-5xl font-black tracking-tight text-stone-950 sm:text-6xl">{cardElementLabel(current)}</div>}
                    {promptMode === 'meaning' && <div className="max-w-xl font-serif text-3xl font-black leading-tight text-stone-950 sm:text-4xl">{current.meaning}</div>}
                    {promptMode === 'picture' && <MnemonicSprite card={current} atlasUrl={atlasUrl} className="w-full max-w-[300px]" />}
                    <p className="mt-10 text-[9px] font-black uppercase tracking-widest text-stone-300">Click or press Space to flip</p>
                  </div> : <div className="grid min-h-[430px] gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:p-8">
                    <div><span className="rounded-full bg-stone-900 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">{current.family === 'Latin' ? 'Latin base' : 'Greek combining form'}</span><div className="mt-5 font-serif text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">{cardElementLabel(current)}</div><div className="mt-6 border-l-4 border-red-800 pl-4"><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Meaning</p><p className="mt-1 font-serif text-2xl font-black text-stone-900">{current.meaning}</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Example</p><p className="mt-1 text-base font-black text-stone-800">{current.example}</p></div>{current.related.length > 0 && <div><p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Related bases</p><p className="mt-1 text-base font-black text-stone-800">{current.related.join(', ')}</p></div>}</div>{teacherInfo && <div className="mt-6 rounded-2xl border border-stone-200 bg-white/70 p-4 text-[10px] font-bold leading-relaxed text-stone-500"><strong className="text-stone-800">Teacher source details</strong><br />First taught: {current.firstTaught} • Notebook {current.sourceVolume} p. {current.sourcePage}<br />{current.notebookCategory}</div>}</div>
                    <MnemonicSprite card={current} atlasUrl={atlasUrl} className="mx-auto w-full max-w-[240px]" />
                  </div>}
                </div>
              </button>
              <div className="mt-5 flex items-center gap-3"><button type="button" onClick={() => move(-1)} className={`${buttonBase} border-stone-200 bg-white text-stone-600 hover:border-stone-400`}><ArrowLeft className="h-4 w-4" /></button><div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-red-800 transition-all" style={{ width: `${cards.length ? ((index + 1) / cards.length) * 100 : 0}%` }} /></div><span className="min-w-[72px] text-center text-[10px] font-black uppercase tracking-widest text-stone-500">{cards.length ? index + 1 : 0} of {cards.length}</span><button type="button" onClick={() => move(1)} className={`${buttonBase} border-stone-200 bg-white text-stone-600 hover:border-stone-400`}><ArrowRight className="h-4 w-4" /></button></div>
            </>}
          </div>
          <aside className="space-y-3 rounded-[2rem] border border-stone-200 bg-stone-950 p-5 text-white shadow-sm"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-500">Deck controls</p><button type="button" onClick={() => setFlipped(value => !value)} className="flex w-full items-center gap-3 rounded-xl bg-red-800 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-red-700"><FlipHorizontal2 className="h-4 w-4" /> Flip</button><button type="button" onClick={shuffle} className="flex w-full items-center gap-3 rounded-xl border border-stone-700 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-stone-200 hover:bg-stone-900"><Shuffle className="h-4 w-4" /> Shuffle</button><button type="button" onClick={random} className="flex w-full items-center gap-3 rounded-xl border border-stone-700 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-stone-200 hover:bg-stone-900"><Dices className="h-4 w-4" /> Random card</button><button type="button" onClick={resetOrder} className="flex w-full items-center gap-3 rounded-xl border border-stone-700 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-stone-200 hover:bg-stone-900"><BookOpenCheck className="h-4 w-4" /> Source order</button><div className="border-t border-stone-800 pt-4 text-[9px] font-bold leading-relaxed text-stone-500"><p><strong className="text-stone-300">Keyboard:</strong> ←/→ cards • Space flip • S shuffle • R random • T teacher info • B browse</p><p className="mt-3">No mastery score is recorded. This is a review surface, not an assessment.</p></div></aside>
        </div>
      ) : (
        <div className="space-y-4"><div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-300" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search element, meaning, example, related base, or Substep" className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-4 text-xs font-bold text-stone-800 outline-none focus:border-red-800" /></label><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-stone-400"><ListFilter className="h-4 w-4" /> {browseCards.length} cards</div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{browseCards.map(card => <button key={card.id} type="button" onClick={() => { const cardIndex = cards.findIndex(candidate => candidate.id === card.id); if (cardIndex >= 0) setIndex(cardIndex); setFlipped(false); setView('study'); }} className="rounded-3xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-800 hover:shadow-md"><div className="flex items-center justify-between"><span className="rounded-full bg-stone-900 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white">{card.family}</span><span className="text-[9px] font-black uppercase tracking-widest text-stone-400">{card.firstTaught}</span></div><div className="mt-4 font-serif text-3xl font-black text-stone-950">{cardElementLabel(card)}</div><div className="mt-2 text-sm font-bold text-stone-600">{card.meaning}</div><div className="mt-4 flex items-center gap-4 border-t border-stone-100 pt-4"><MnemonicSprite card={card} atlasUrl={atlasUrl} className="w-20 shrink-0" /><div><p className="text-[8px] font-black uppercase tracking-widest text-stone-400">Example</p><p className="text-xs font-black text-stone-800">{card.example}</p></div></div></button>)}</div></div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-[9px] font-bold leading-relaxed text-stone-400"><Sparkles className="mr-2 inline h-3.5 w-3.5 text-red-800" />{WORD_ELEMENT_REVIEW_SOURCE_NOTE} Protected mnemonic images require an authenticated teacher session and are not written to student records.</div>
    </section>
  );
};

export default WordElementReviewDeck;
