import React, { useState } from 'react';
import { BookOpen, RefreshCw, Save } from 'lucide-react';
import { GroupProfile } from '../types';

interface SquadJournalProps {
  group: GroupProfile;
  onUpdate: (notes: string) => void;
}

const SquadJournal: React.FC<SquadJournalProps> = ({ group, onUpdate }) => {
  const [notes, setNotes] = useState(group.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(notes);
    setIsSaving(false);
  };

  return (
    <div className="bg-[#fdf6e3] text-stone-900 p-8 rounded-[2.5rem] border-4 border-stone-800 shadow-2xl flex flex-col h-full min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-900 rounded-lg">
            <BookOpen className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest font-serif">Sensei's Log: {group.name}</h3>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving || notes === (group.notes || '')}
          className="px-4 py-2 bg-stone-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-500" />}
          {isSaving ? 'Saving...' : 'Save Log'}
        </button>
      </div>
      <textarea 
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Record daily observations, squad goals, or mission notes here..."
        className="flex-1 bg-white/50 border-2 border-stone-100 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:border-red-800 transition-colors resize-none font-serif leading-relaxed"
      />
      <p className="mt-4 text-[9px] text-stone-400 font-bold uppercase tracking-widest text-center italic">
        "The brush is as mighty as the sword in the hands of a Master."
      </p>
    </div>
  );
};

export default SquadJournal;
