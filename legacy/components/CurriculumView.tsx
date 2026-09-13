import React, { useState } from 'react';
import { GroupProfile, Lesson } from '../types';
import { ALL_MASTER_LESSONS } from '../lessons/index';
import MissionCard from './MissionCard';
import SquadJournal from './SquadJournal';
import WordElementReviewDeck from './WordElementReviewDeck';
import { Users, BookOpen, Printer, Plus, Layers } from 'lucide-react';

const MASTER_LESSONS = ALL_MASTER_LESSONS.filter((lesson): lesson is Lesson => Boolean(lesson?.id));

interface CurriculumViewProps {
  groups: GroupProfile[];
  activeGroup: GroupProfile | null;
  onSelectGroup: (group: GroupProfile | null) => void;
  onUpdateGroups: (groups: GroupProfile[]) => void;
  onLaunchLesson: (lesson: Lesson) => void;
  onPrintLesson: (lesson: Lesson) => void;
}

const CurriculumView: React.FC<CurriculumViewProps> = ({
  groups, activeGroup, onSelectGroup, onUpdateGroups, onLaunchLesson, onPrintLesson
}) => {
  const [showJournal, setShowJournal] = useState(false);
  const [libraryMode, setLibraryMode] = useState<'registry' | 'word-elements'>('registry');

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="mb-6 rounded-3xl border border-stone-700 bg-stone-800/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex w-fit items-center gap-1 rounded-xl border border-stone-600 bg-stone-950 p-1">
              <button
                type="button"
                onClick={() => setLibraryMode('registry')}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-widest transition ${libraryMode === 'registry' ? 'bg-white text-stone-950' : 'text-stone-400 hover:text-white'}`}
              >
                <BookOpen className="h-3.5 w-3.5" /> Master Registry
              </button>
              <button
                type="button"
                onClick={() => setLibraryMode('word-elements')}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-widest transition ${libraryMode === 'word-elements' ? 'bg-white text-stone-950' : 'text-stone-400 hover:text-white'}`}
              >
                <Layers className="h-3.5 w-3.5" /> Word Element Review
              </button>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">{libraryMode === 'registry' ? 'Master Registry' : 'Mnemonic Review Deck'}</h3>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
              {libraryMode === 'registry' ? 'The complete WRS curriculum scrolls' : 'Illustrated Latin bases and Greek combining forms'}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-stone-600 bg-stone-950 p-3 shadow-sm">
            <Users className="h-4 w-4 text-white" />
            <div className="flex flex-col">
              <label htmlFor="target-group" className="mb-1 ml-1 text-[10px] font-black uppercase tracking-widest text-amber-300">Target Group</label>
              <select
                id="target-group"
                value={activeGroup?.id || ''}
                onChange={(event) => {
                  const group = groups.find(candidate => candidate.id === event.target.value);
                  onSelectGroup(group || null);
                }}
                className="cursor-pointer bg-transparent pr-4 text-xs font-black uppercase tracking-widest text-white outline-none"
              >
                <option value="" className="bg-stone-900">No Group Selected</option>
                {groups.map(group => <option key={group.id} value={group.id} className="bg-stone-900">{group.name}</option>)}
              </select>
            </div>
            {activeGroup && libraryMode === 'registry' && (
              <button
                onClick={() => setShowJournal(!showJournal)}
                className={`rounded-lg p-2 transition-all ${showJournal ? 'bg-red-800 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
                title="Sensei's Log"
              >
                <BookOpen className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {libraryMode === 'word-elements' ? (
        <WordElementReviewDeck activeGroup={activeGroup} />
      ) : (
        <>
          {activeGroup && showJournal && (
            <div className="mb-8 animate-in slide-in-from-top-4">
              <SquadJournal
                group={activeGroup}
                onUpdate={(notes: string) => {
                  onUpdateGroups(groups.map(group => group.id === activeGroup.id ? { ...group, notes } : group));
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MASTER_LESSONS.map(lesson => (
              <MissionCard
                key={lesson.id}
                title={lesson.title}
                badge={`Step ${lesson.step}.${lesson.substep}`}
                onPrimaryAction={() => onLaunchLesson(lesson)}
                primaryActionLabel={activeGroup ? `Deploy to ${activeGroup.name}` : 'Deploy Mission'}
                secondaryActions={[
                  { icon: Printer, title: 'Print Scroll', onClick: () => onPrintLesson(lesson) },
                  ...(activeGroup ? [{
                    icon: Plus,
                    title: 'Add to Group',
                    variant: 'success' as const,
                    onClick: async () => {
                      const alreadySaved = (activeGroup.savedLessons || []).some(savedLesson => savedLesson?.id === lesson.id);
                      if (alreadySaved) {
                        alert("This lesson is already in your group's library.");
                        return;
                      }
                      const updated = { ...activeGroup, savedLessons: [...activeGroup.savedLessons, lesson] };
                      onUpdateGroups(groups.map(group => group.id === activeGroup.id ? updated : group));
                    }
                  }] : [])
                ]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CurriculumView;
