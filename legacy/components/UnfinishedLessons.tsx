import React, { useMemo, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import {
  DiscardState, GroupSpot, GroupSpotMap, discardCancelled, discardConfirmed, discardPrompt, discardRequested,
  formatSpotDate, noDiscardPending, spotRows
} from '../groupSpots';
import { localDateString } from '../lessonLibrary';

interface UnfinishedLessonsProps {
  spots: GroupSpotMap;
  onResume: (spot: GroupSpot) => void;
  onDiscard: (spot: GroupSpot) => void;
  error?: string;
  /** YYYY-MM-DD; only tests pass this. */
  today?: string;
}

/** Every group's saved spot, one row each. Rows are never removed automatically. */
const UnfinishedLessons: React.FC<UnfinishedLessonsProps> = ({ spots, onResume, onDiscard, error, today }) => {
  const [discard, setDiscard] = useState<DiscardState>(noDiscardPending);
  const rows = useMemo(() => spotRows(spots, today || localDateString()), [spots, today]);
  if (rows.length === 0 && !error) return null;

  return (
    <section className="w-full border-b border-emerald-200 bg-emerald-50 px-4 py-3" aria-label="Unfinished lessons">
      <div className="mx-auto max-w-5xl space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">Unfinished lessons</p>
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-900">{error}</p>
        )}
        {rows.map(({ spot, stale }) => (
          <div
            key={spot.groupId}
            data-stale={stale ? 'true' : 'false'}
            className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              stale ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-white'
            }`}
          >
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${stale ? 'text-amber-800' : 'text-emerald-800'}`}>{spot.groupName}</p>
              <h2 className="font-serif text-base font-black text-stone-900">{spot.lessonTitle}</h2>
              <p className="mt-0.5 text-[10px] font-bold text-stone-500">
                Part {spot.currentPart} · Started {formatSpotDate(spot.dateStarted)} · Last worked {formatSpotDate(spot.lastWorkedOn)}
                {stale && <span className="ml-2 font-black text-amber-800">Waiting over a week</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscard(discardRequested(spot))}
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-stone-500 hover:border-red-200 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Discard
              </button>
              <button
                type="button"
                onClick={() => onResume(spot)}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-emerald-600"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" /> Resume
              </button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmModal
        isOpen={Boolean(discard.pending)}
        onClose={() => setDiscard(discardCancelled())}
        onConfirm={() => setDiscard(current => discardConfirmed(current, onDiscard))}
        title="Discard unfinished lesson"
        message={discard.pending ? discardPrompt(discard.pending.groupName) : ''}
        confirmLabel="Discard"
      />
    </section>
  );
};

export default UnfinishedLessons;
