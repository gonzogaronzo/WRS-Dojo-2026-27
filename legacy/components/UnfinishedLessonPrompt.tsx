import React from 'react';
import { Play, X } from 'lucide-react';
import { GroupSpot, conflictPrompt } from '../groupSpots';

interface UnfinishedLessonPromptProps {
  spot: GroupSpot | null;
  onResume: () => void;
  onStartNew: () => void;
  onCancel: () => void;
}

/** Asked whenever a lesson is launched for a group that already has an unfinished one. */
const UnfinishedLessonPrompt: React.FC<UnfinishedLessonPromptProps> = ({ spot, onResume, onStartNew, onCancel }) => {
  if (!spot) return null;
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="unfinished-lesson-title">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="unfinished-lesson-title" className="font-serif text-xl font-black text-stone-900">Unfinished lesson</h2>
          <button type="button" onClick={onCancel} className="text-stone-400 hover:text-stone-700" aria-label="Cancel"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-3 text-sm font-medium leading-relaxed text-stone-600">{conflictPrompt(spot)}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onResume}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-600"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" /> Resume it
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="flex-1 rounded-xl border-2 border-stone-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-stone-600 hover:bg-stone-50"
          >
            Start the new lesson
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnfinishedLessonPrompt;
