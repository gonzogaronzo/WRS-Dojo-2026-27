import React, { useState } from 'react';
import { GroupProfile, Lesson } from '../types';
import { ALL_MASTER_LESSONS } from '../lessons/index';
import MissionCard from './MissionCard';
import SquadJournal from './SquadJournal';
import { Users, Scroll, BookOpen, Printer, Plus, Layers } from 'lucide-react';

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

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="bg-stone-800/50 p-6 rounded-3xl border border-stone-700 flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-black uppercase tracking-widest text-xs">Master Registry</h3>
          <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-1">The complete WRS curriculum scrolls</p>
        </div>
        
        <div className="flex items-center gap-3 bg-stone-900/50 p-2 rounded-2xl border border-stone-700">
          <Users className="w-4 h-4 text-stone-500" />
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-stone-500 uppercase tracking-widest ml-1 mb-0.5">Target Group</span>
            <select 
              value={activeGroup?.id || ''} 
              onChange={(e) => {
                const g = groups.find(group => group.id === e.target.value);
                onSelectGroup(g || null);
              }}
              className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer pr-4"
            >
              <option value="" className="bg-stone-900">No Group Selected</option>
              {groups.map(g => (
                <option key={g.id} value={g.id} className="bg-stone-900">{g.name}</option>
              ))}
            </select>
          </div>
          {activeGroup && (
            <button 
              onClick={() => setShowJournal(!showJournal)}
              className={`p-2 rounded-lg transition-all ${showJournal ? 'bg-red-800 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
              title="Sensei's Log"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {activeGroup && showJournal && (
        <div className="mb-8 animate-in slide-in-from-top-4">
          <SquadJournal 
            group={activeGroup} 
            onUpdate={(notes: string) => {
              onUpdateGroups(groups.map(g => g.id === activeGroup.id ? { ...g, notes } : g));
            }} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MASTER_LESSONS.map(lesson => (
          <MissionCard 
            key={lesson.id}
            title={lesson.title}
            badge={`Step ${lesson.step}.${lesson.substep}`}
            onPrimaryAction={() => onLaunchLesson(lesson)}
            primaryActionLabel={activeGroup ? `Deploy to ${activeGroup.name}` : 'Deploy Mission'}
            secondaryActions={[
              {
                icon: Printer,
                title: 'Print Scroll',
                onClick: () => onPrintLesson(lesson)
              },
              ...(activeGroup ? [{
                icon: Plus,
                title: 'Add to Group',
                variant: 'success' as const,
                onClick: async () => {
                  const alreadySaved = (activeGroup.savedLessons || []).some(sl => sl?.id === lesson.id);
                  if (alreadySaved) {
                    alert("This lesson is already in your group's library.");
                    return;
                  }
                  const updated = { ...activeGroup, savedLessons: [...activeGroup.savedLessons, lesson] };
                  onUpdateGroups(groups.map(g => g.id === activeGroup.id ? updated : g));
                }
              }] : [])
            ]}
          />
        ))}
      </div>
    </div>
  );
};

export default CurriculumView;
