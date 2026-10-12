import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { WORD_ELEMENT_SOURCE_NOTE, WORD_ELEMENT_SUBSTEPS, WordElementCard } from '../../wordElementMnemonics';
import {
  ElementReviewSessionState,
  ReviewFamily,
  ReviewPromptMode,
  ReviewScope,
  effectiveSubstep,
  elementText,
  flipReviewCard,
  jumpToReviewCard,
  moveReviewCard,
  randomReviewCard,
  resetReviewOrder,
  reviewCardsForOrder,
  reviewOrderIsStale,
  setReviewFamily,
  setReviewPromptMode,
  setReviewScope,
  setReviewSubstep,
  setReviewView,
  shuffleReviewCards,
  substepKey,
  syncReviewOrder
} from '../../wordElementReview';

interface ElementReviewDeckProps {
  review: ElementReviewSessionState;
  lessonSubstep: string | null;
  onChange: (update: (previous: ElementReviewSessionState) => ElementReviewSessionState) => void;
  readOnly?: boolean;
}

const EMPTY_MESSAGE = 'No illustrated cards match those filters.';

const FRONT_PROMPTS: Record<ReviewPromptMode, (card: WordElementCard) => string> = {
  element: card => (card.family === 'Latin' ? 'What does this Latin base mean?' : 'What does this Greek combining form mean?'),
  meaning: () => 'Which word element matches this meaning?',
  picture: () => 'Which word element does this mnemonic picture cue?'
};

const familyLabel = (card: WordElementCard) => (card.family === 'Latin' ? 'Latin base' : 'Greek combining form');

const FrontFace: React.FC<{ card: WordElementCard; promptMode: ReviewPromptMode }> = ({ card, promptMode }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center text-stone-900">
    <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-stone-500">{FRONT_PROMPTS[promptMode](card)}</div>
    {promptMode === 'picture' ? (
      <img src={card.image} alt="Mnemonic illustration prompt" className="max-h-[280px] max-w-[70%] object-contain" />
    ) : (
      <div className={`break-words font-extrabold leading-[1.03] ${promptMode === 'meaning' ? 'max-w-xl text-4xl md:text-[42px]' : 'text-6xl md:text-7xl'}`}>
        {promptMode === 'meaning' ? card.meaning : elementText(card)}
      </div>
    )}
  </div>
);

const BackFace: React.FC<{ card: WordElementCard; showSource: boolean }> = ({ card, showSource }) => (
  <div className="grid h-full w-full grid-cols-[40%_60%] text-stone-900 md:grid-cols-[42%_58%]">
    <div className="flex items-center justify-center border-r border-stone-300 bg-stone-50 p-4">
      <img src={card.image} alt={`Mnemonic illustration for ${elementText(card)}`} className="max-h-full max-w-full object-contain" />
    </div>
    <div className="flex min-h-0 flex-col gap-3 overflow-auto p-6 md:p-8">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-stone-500">{familyLabel(card)}</div>
      <div className="text-3xl font-extrabold leading-[1.05] text-stone-700 md:text-4xl">{elementText(card)}</div>
      <div>
        <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-stone-500">Meaning</div>
        <div className="text-2xl font-extrabold leading-[1.12] md:text-3xl">{card.meaning}</div>
      </div>
      <div>
        <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-stone-500">Example word</div>
        <div className="text-xl font-bold md:text-2xl">{card.example}</div>
      </div>
      {card.related.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-stone-500">Related base(s)</div>
          <div className="text-base leading-tight">{card.related.join(', ')}</div>
        </div>
      )}
      {showSource && (
        <div className="mt-auto border-t border-stone-300 pt-3 text-[11px] leading-snug text-stone-500">
          <strong className="text-stone-700">Teacher source details</strong><br />
          First taught: {card.firstTaught} • Notebook {card.sourceVolume} p. {card.sourcePage}<br />
          {card.notebookCategory}
          {card.auditFlags.length > 0 && <><br />Audit: {card.auditFlags.join('; ')}</>}
        </div>
      )}
    </div>
  </div>
);

const segmentButton = (active: boolean) =>
  `rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider ${active ? 'bg-stone-600 text-white' : 'text-stone-400'}`;
const selectClass = 'h-9 rounded-lg border border-stone-600 bg-stone-800 px-2 text-sm font-semibold text-stone-100';
const fieldLabel = 'text-[10px] font-extrabold uppercase tracking-[0.09em] text-stone-400';
const actionButton = 'rounded-lg border border-stone-600 bg-stone-800 px-4 py-2 text-sm font-bold text-stone-100 hover:bg-stone-700';

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== 'string') return false;
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) || element.isContentEditable === true;
};

const isActivatable = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(element && typeof element.tagName === 'string' && ['BUTTON', 'A', 'SUMMARY'].includes(element.tagName));
};

const ElementReviewDeck: React.FC<ElementReviewDeckProps> = ({ review, lessonSubstep, onChange, readOnly = false }) => {
  const [search, setSearch] = useState('');
  const cards = useMemo(() => reviewCardsForOrder(review.order), [review.order]);
  const current = cards[Math.min(review.index, Math.max(0, cards.length - 1))];
  const target = effectiveSubstep(review, lessonSubstep);
  const reviewRef = useRef(review);
  reviewRef.current = review;

  // Teacher only: keep the stored order in step with the filters (e.g. the lesson changed).
  useEffect(() => {
    if (readOnly || !reviewOrderIsStale(review, lessonSubstep)) return;
    onChange(previous => syncReviewOrder(previous, lessonSubstep, previous.order[previous.index]));
  }, [readOnly, review, lessonSubstep]);

  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const inStudy = reviewRef.current.view === 'study';
      const key = event.key.toLowerCase();
      if (key === 'b') { onChange(previous => setReviewView(previous, previous.view === 'browse' ? 'study' : 'browse')); return; }
      if (!inStudy) return;
      if (event.key === 'ArrowRight') onChange(previous => moveReviewCard(previous, 1));
      else if (event.key === 'ArrowLeft') onChange(previous => moveReviewCard(previous, -1));
      else if (event.key === ' ' || event.key === 'Enter') {
        if (isActivatable(event.target)) return;
        event.preventDefault();
        onChange(flipReviewCard);
      } else if (key === 's') onChange(previous => shuffleReviewCards(previous));
      else if (key === 'r') onChange(previous => randomReviewCard(previous));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, onChange]);

  const empty = (
    <div className="max-w-md rounded-2xl border border-stone-700 bg-stone-800/70 p-8 text-center text-stone-300">
      <strong className="text-lg text-stone-100">{EMPTY_MESSAGE}</strong>
      {!readOnly && <p className="mt-3 text-sm">Choose a later Substep, a different family, or a different scope.</p>}
    </div>
  );

  // Student screen: the current card only. The back face is not rendered until the teacher flips.
  if (readOnly) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        {!current ? empty : (
          <div className="relative w-full max-w-4xl rounded-[1.5rem] border-4 border-stone-300 bg-stone-100 shadow-2xl" style={{ height: 'clamp(340px, 56vh, 560px)' }}>
            <motion.div
              key={`${current.id}:${review.flipped ? 'back' : 'front'}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              className="h-full w-full overflow-hidden rounded-[1.25rem]"
            >
              {review.flipped
                ? <BackFace card={current} showSource={false} />
                : <FrontFace card={current} promptMode={review.promptMode} />}
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const visible = query
    ? cards.filter(card => [elementText(card), card.meaning, card.example, card.related.join(' '), card.firstTaught].join(' ').toLowerCase().includes(query))
    : cards;
  const familyName = review.family === 'All' ? 'Latin + Greek' : review.family;
  const scopeSummary = review.scope === 'all'
    ? `${familyName} • all illustrated`
    : review.scope === 'current' ? `${familyName} • Substep ${target ?? '—'}` : `${familyName} • through ${target ?? '—'}`;
  const substepOptions = target && !WORD_ELEMENT_SUBSTEPS.includes(target) && substepKey(target) !== null
    ? [...WORD_ELEMENT_SUBSTEPS, target].sort((a, b) => (substepKey(a) ?? 0) - (substepKey(b) ?? 0))
    : WORD_ELEMENT_SUBSTEPS;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <div className="flex flex-wrap items-end gap-4 border-b border-stone-800 px-6 py-4">
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Family</span>
          <div className="flex items-center rounded-xl border border-stone-700 bg-stone-800 p-1">
            {(['All', 'Latin', 'Greek'] as ReviewFamily[]).map(family => (
              <button key={family} onClick={() => onChange(previous => setReviewFamily(previous, family, lessonSubstep))} className={segmentButton(review.family === family)}>{family}</button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Scope</span>
          <select className={selectClass} value={review.scope} onChange={event => onChange(previous => setReviewScope(previous, event.target.value as ReviewScope, lessonSubstep))}>
            <option value="through">Cumulative through Substep</option>
            <option value="all">All illustrated</option>
            <option value="current">Current Substep only</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Review through Substep</span>
          <select className={selectClass} value={target ?? ''} onChange={event => onChange(previous => setReviewSubstep(previous, event.target.value))}>
            {!target && <option value="">—</option>}
            {substepOptions.map(substep => <option key={substep} value={substep}>{substep}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Prompt</span>
          <select className={selectClass} value={review.promptMode} onChange={event => onChange(previous => setReviewPromptMode(previous, event.target.value as ReviewPromptMode))}>
            <option value="element">Element → Meaning</option>
            <option value="meaning">Meaning → Element</option>
            <option value="picture">Picture → Element</option>
          </select>
        </label>
        <div className="ml-auto flex items-center rounded-xl border border-stone-700 bg-stone-800 p-1">
          <button onClick={() => onChange(previous => setReviewView(previous, 'study'))} className={segmentButton(review.view === 'study')}>Study</button>
          <button onClick={() => onChange(previous => setReviewView(previous, 'browse'))} className={segmentButton(review.view === 'browse')}>Browse</button>
        </div>
      </div>

      {review.view === 'study' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-6">
          {!current ? empty : (
            <>
              <div className="flex w-full max-w-5xl items-center gap-4">
                <button onClick={() => onChange(previous => moveReviewCard(previous, -1))} aria-label="Previous card" className="h-12 w-12 shrink-0 rounded-full border border-stone-600 bg-stone-800 text-2xl text-stone-100 hover:bg-stone-700">‹</button>
                <div className="min-w-0 flex-1" style={{ perspective: '1600px' }}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Flip review card"
                    onClick={() => onChange(flipReviewCard)}
                    className="relative w-full cursor-pointer transition-transform duration-500 motion-reduce:transition-none"
                    style={{ height: 'clamp(340px, 52vh, 540px)', transformStyle: 'preserve-3d', transform: review.flipped ? 'rotateY(180deg)' : 'none' }}
                  >
                    <section aria-hidden={review.flipped} className="absolute inset-0 overflow-hidden rounded-[1.5rem] border-4 border-stone-300 bg-stone-100 shadow-2xl" style={{ backfaceVisibility: 'hidden' }}>
                      <FrontFace card={current} promptMode={review.promptMode} />
                      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-stone-500">Click or press <kbd className="rounded border border-stone-300 bg-white px-1 font-mono text-[10px]">Space</kbd> to flip</div>
                    </section>
                    <section aria-hidden={!review.flipped} className="absolute inset-0 overflow-hidden rounded-[1.5rem] border-4 border-stone-300 bg-stone-100 shadow-2xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                      <BackFace card={current} showSource />
                    </section>
                  </div>
                </div>
                <button onClick={() => onChange(previous => moveReviewCard(previous, 1))} aria-label="Next card" className="h-12 w-12 shrink-0 rounded-full border border-stone-600 bg-stone-800 text-2xl text-stone-100 hover:bg-stone-700">›</button>
              </div>
              <div className="flex w-full max-w-3xl items-center justify-between gap-3 text-xs text-stone-400">
                <span>{Math.min(review.index, cards.length - 1) + 1} of {cards.length}</span>
                <div className="h-1.5 max-w-[270px] flex-1 overflow-hidden rounded-full bg-stone-700"><span className="block h-full bg-stone-300" style={{ width: `${((Math.min(review.index, cards.length - 1) + 1) / cards.length) * 100}%` }} /></div>
                <span>{scopeSummary}</span>
              </div>
              <div className="flex gap-2">
                <button className={actionButton} onClick={() => onChange(flipReviewCard)}>Flip</button>
                <button className={`${actionButton} bg-blue-600 hover:bg-blue-500`} onClick={() => onChange(previous => shuffleReviewCards(previous))}>Shuffle</button>
                <button className={actionButton} onClick={() => onChange(previous => randomReviewCard(previous))}>Random</button>
                <button className={`${actionButton} border-transparent bg-transparent`} onClick={() => onChange(previous => resetReviewOrder(previous, lessonSubstep))}>Reset order</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 px-6 py-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[240px] flex-col gap-1">
              <span className={fieldLabel}>Find an element, meaning, or example</span>
              <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try: water, -cept-, photograph…" className={selectClass} />
            </label>
            <div className="ml-auto text-xs text-stone-400">{visible.length} card{visible.length === 1 ? '' : 's'}</div>
          </div>
          {cards.length === 0 ? <div className="flex justify-center py-6">{empty}</div> : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {visible.map(card => (
                <article
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Study ${elementText(card)}`}
                  onClick={() => onChange(previous => jumpToReviewCard(previous, card.id))}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onChange(previous => jumpToReviewCard(previous, card.id)); } }}
                  className="flex min-h-[150px] cursor-pointer flex-col gap-2 rounded-2xl border border-stone-700 bg-stone-800/70 p-3 hover:bg-stone-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-stone-400">{card.family}</span>
                    <span className="rounded-full bg-stone-700 px-2 py-0.5 text-[10px] font-bold text-stone-100">{card.firstTaught}</span>
                  </div>
                  <div className="text-2xl font-extrabold leading-tight text-stone-100">{elementText(card)}</div>
                  <div className="text-sm font-semibold leading-tight text-stone-300">{card.meaning}</div>
                  <div className="mt-auto flex items-center gap-2 text-[11px] text-stone-400">
                    <img src={card.image} alt="" className="h-11 w-11 rounded-md bg-stone-100 object-contain" />
                    <span>{card.example}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="text-[11px] text-stone-500">Click any card to jump to it in Study view. The student screen keeps showing the current card's front while you browse.</div>
        </div>
      )}

      <footer className="border-t border-stone-800 px-6 py-3 text-[11px] leading-snug text-stone-500">
        Wilson-source content, teacher-created review interface. No student data is recorded by this tool. {WORD_ELEMENT_SOURCE_NOTE}
      </footer>
    </div>
  );
};

export default ElementReviewDeck;
