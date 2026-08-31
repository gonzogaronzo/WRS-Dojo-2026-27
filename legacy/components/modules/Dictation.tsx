import React, { useState } from 'react';
import { DictationSection } from '../../types';
import { CheckCircle2 } from 'lucide-react';

interface DictationProps {
  data: DictationSection;
  completedIds?: string[];
  onUpdateCompletedIds?: (ids: string[]) => void;
}

const Dictation: React.FC<DictationProps> = ({ 
  data,
  completedIds: syncedIds,
  onUpdateCompletedIds
}) => {
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());
  const completed = syncedIds ? new Set(syncedIds) : localCompleted;

  const toggleComplete = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    
    if (onUpdateCompletedIds) onUpdateCompletedIds(Array.from(next));
    else setLocalCompleted(next);
  };

  const Section = ({ title, items, prefix }: { title: string, items: string[], prefix: string }) => (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
        {title}
      </h3>
      <div className="space-y-2">
        {items.length === 0 && <span className="text-gray-400 italic text-sm">None</span>}
        {items.map((item, idx) => {
          const id = `${prefix}-${idx}`;
          const isDone = completed.has(id);
          return (
            <div 
              key={id} 
              onClick={() => toggleComplete(id)}
              className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                ${isDone 
                  ? 'bg-green-50 border-green-200 text-gray-400 line-through' 
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
            >
              <span className={`text-lg font-medium ${isDone ? 'text-gray-400' : 'text-gray-800'}`}>
                {item}
              </span>
              <CheckCircle2 className={`w-5 h-5 ${isDone ? 'text-green-500' : 'text-gray-200 group-hover:text-blue-200'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-full flex flex-col p-8 bg-slate-50">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Dictation</h2>
        <p className="text-gray-600">
          Read the items clearly. Students repeat, name the letters, then write.
        </p>
      </div>

      <div className="max-w-3xl w-full mx-auto space-y-6 pb-12">
        <Section title="Sounds" items={data.sounds} prefix="snd" />
        <Section title="Real Words" items={data.realWords} prefix="wrd" />
        <Section title="Word Elements" items={data.wordElements} prefix="elt" />
        <Section title="Nonsense Words" items={data.nonsenseWords} prefix="non" />
        <Section title="Phrases" items={data.phrases} prefix="phr" />
        <Section title="Sentences" items={data.sentences} prefix="sen" />
      </div>
    </div>
  );
};

export default Dictation;