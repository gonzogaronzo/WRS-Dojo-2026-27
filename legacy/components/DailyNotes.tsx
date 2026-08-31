import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { Calendar, Save, Plus, RefreshCw, BookOpen, Clock, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DailyNote } from '../types';

interface DailyNotesProps {
  userId: string;
}

const DailyNotes: React.FC<DailyNotesProps> = ({ userId }) => {
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [currentNote, setCurrentNote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  
  // Get local date string YYYY-MM-DD
  const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));

  useEffect(() => {
    if (userId && userId !== 'guest-sensei') {
      fetchNotes();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'daily_notes'),
        where('userId', '==', userId),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyNote));
      
      // Sort in memory to avoid index requirement
      fetchedNotes.sort((a, b) => b.date.localeCompare(a.date));
      
      setNotes(fetchedNotes);
      
      // Check if there's a note for the currently selected date
      const activeNote = fetchedNotes.find(n => n.date === selectedDate);
      if (activeNote) {
        setCurrentNote(activeNote.content);
      } else if (selectedDate === getLocalDateString(new Date())) {
        // If we just loaded and it's today, clear if no note exists
        setCurrentNote('');
      }
    } catch (err: any) {
      console.error("Error fetching daily notes:", err);
      setError("Failed to retrieve your logs from the archives.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || userId === 'guest-sensei') return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const existingNote = notes.find(n => n.date === selectedDate);
      if (existingNote) {
        await updateDoc(doc(db, 'daily_notes', existingNote.id), {
          content: currentNote,
          lastUpdated: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'daily_notes'), {
          userId,
          date: selectedDate,
          content: currentNote,
          lastUpdated: serverTimestamp()
        });
      }
      await fetchNotes();
      setLastSavedAt(new Date().toISOString());
    } catch (saveFailure) {
      console.error("Error saving daily note:", saveFailure);
      const detail = saveFailure instanceof Error ? saveFailure.message : String(saveFailure);
      setSaveError(`Daily log could not be saved: ${detail}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (userId === 'guest-sensei') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-stone-800/30 rounded-[2rem] border-4 border-dashed border-stone-700">
        <BookOpen className="w-12 h-12 text-amber-500" />
        <h3 className="text-xl font-black font-serif uppercase tracking-widest text-white">Daily Log Restricted</h3>
        <p className="text-stone-500 text-sm max-w-md">The Daily Log is only available when connected to the Cloud Temple. Guest sessions are temporary.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <RefreshCw className="w-10 h-10 text-red-800 animate-spin mb-4" />
        <p className="text-stone-500 font-black uppercase text-[10px] tracking-widest">Consulting the Daily Archives...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-red-900/20 rounded-[2rem] border-4 border-dashed border-red-900/30">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h3 className="text-xl font-black font-serif uppercase tracking-widest text-white">Archives Unreachable</h3>
        <p className="text-red-400 text-sm max-w-md">{error}</p>
        <button onClick={fetchNotes} className="mt-4 px-6 py-2 bg-red-900 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#fdf6e3] text-stone-900 p-8 rounded-[2.5rem] border-4 border-stone-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-900 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest font-serif">Sensei's Daily Log</h3>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{selectedDate === getLocalDateString(new Date()) ? 'Today' : selectedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => {
                const today = getLocalDateString(new Date());
                setSelectedDate(today);
                const note = notes.find(n => n.date === today);
                setCurrentNote(note ? note.content : '');
              }}
              className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-stone-300 transition-all"
            >
              Today
            </button>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                const date = e.target.value;
                setSelectedDate(date);
                const note = notes.find(n => n.date === date);
                setCurrentNote(note ? note.content : '');
              }}
              className="bg-white border-2 border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-red-800 flex-1 sm:flex-none"
            />
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-stone-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-500" />}
              {isSaving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>
        <textarea 
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
          placeholder="Record your daily reflections, teaching breakthroughs, or focus areas..."
          className="w-full h-64 bg-white/50 border-2 border-stone-100 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:border-red-800 transition-colors resize-none font-serif leading-relaxed"
        />
        {saveError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-[10px] font-black leading-relaxed">{saveError}</p>
          </div>
        )}
        {!saveError && lastSavedAt && (
          <div className="mt-4 flex items-center justify-center gap-2 text-emerald-700" role="status">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <p className="text-[9px] font-black uppercase tracking-widest">
              Cloud save confirmed {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(lastSavedAt))}
            </p>
          </div>
        )}
        <p className="mt-4 text-[9px] text-stone-400 font-bold uppercase tracking-widest text-center italic">
          "A single stroke of the brush captures the wisdom of a thousand days."
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.filter(n => n.date !== selectedDate).map(note => (
          <div 
            key={note.id} 
            onClick={() => {
              setSelectedDate(note.date);
              setCurrentNote(note.content);
            }}
            className="bg-stone-800/50 p-6 rounded-3xl border border-stone-700 hover:border-red-800 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-stone-500" />
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{note.date}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-red-500 transition-colors" />
            </div>
            <p className="text-stone-300 text-xs line-clamp-3 font-serif leading-relaxed italic">
              "{note.content}"
            </p>
          </div>
        ))}
        {notes.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center bg-stone-800/20 rounded-3xl border-2 border-dashed border-stone-700">
            <Plus className="w-8 h-8 text-stone-600 mx-auto mb-2" />
            <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">No past entries found. Start your legacy today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyNotes;
