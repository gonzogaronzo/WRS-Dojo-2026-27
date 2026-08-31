import React, { useState } from 'react';
import { Edit3, Star, X, Minus, Scissors, Type, MousePointer2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

export interface CodingMark {
  id: string;
  type: 'macron' | 'breve' | 'cross' | 'star' | 'scoop' | 'accent' | 'dot';
  x: number;
  y: number;
  scale: number;
}

interface CodingTrayProps {
  onSpawnMark: (type: CodingMark['type']) => void;
  onClearMarks: () => void;
  active?: boolean;
  vertical?: boolean;
  initiallyCollapsed?: boolean;
}

const TOOLS = [
  { id: 'macron', label: '¯', desc: 'Long', icon: <span className="text-xl font-bold leading-none text-red-500 group-hover:text-white">¯</span> },
  { id: 'breve', label: '˘', desc: 'Short', icon: <span className="text-xl font-bold leading-none text-red-500 group-hover:text-white">˘</span> },
  { id: 'cross', label: '×', desc: 'Silent', icon: <span className="text-xl font-bold leading-none text-red-500 group-hover:text-white">×</span> },
  { id: 'star', label: '★', desc: 'Bonus', icon: <Star className="w-4 h-4 text-red-500 fill-current group-hover:text-white" /> },
  { id: 'scoop', label: '⌣', desc: 'Scoop', icon: <span className="text-xl font-bold leading-none italic text-red-500 group-hover:text-white">⌣</span> },
  { id: 'accent', label: '´', desc: 'Stress', icon: <span className="text-xl font-bold leading-none text-red-500 group-hover:text-white">´</span> },
  { id: 'dot', label: '·', desc: 'Schwa', icon: <span className="text-xl font-bold leading-none text-red-500 group-hover:text-white">·</span> },
];

const CodingTray: React.FC<CodingTrayProps> = ({ onSpawnMark, onClearMarks, active, vertical, initiallyCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={`
      ${vertical ? 'flex-col' : 'flex'} 
      bg-stone-900/90 backdrop-blur-md p-1 rounded-xl border border-stone-700 shadow-xl transition-all duration-300
      ${isCollapsed && vertical ? 'h-auto' : ''}
      ${isCollapsed && !vertical ? 'w-auto' : ''}
    `}>
      <div className={`
        ${vertical ? 'flex-col py-1.5' : 'items-center px-1.5'} 
        flex gap-1 transition-all
      `}>
        <button 
          onClick={toggleCollapse}
          className="p-2 text-red-500 hover:bg-stone-800 rounded-lg transition-colors flex items-center justify-center"
        >
          {isCollapsed ? (
            vertical ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            vertical ? <ChevronUp className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
        {!isCollapsed && (
          <div className={`flex ${vertical ? 'flex-col items-center' : 'items-center'} gap-1 opacity-100 transition-opacity duration-300`}>
            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-[8px] font-black uppercase text-stone-500 tracking-widest hidden lg:inline">Coding</span>
          </div>
        )}
      </div>
      
      {!isCollapsed && (
        <>
          <div className={`${vertical ? 'w-6 h-px my-1' : 'w-px h-6 mx-1'} bg-stone-700 self-center`} />
          <div className={`flex ${vertical ? 'flex-col' : 'flex'} gap-0.5`}>
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSpawnMark(tool.id as CodingMark['type'])}
                className="p-2 text-[#fdf6e3] hover:bg-red-900 rounded-lg transition-all flex flex-col items-center justify-center group min-w-[32px]"
                title={tool.desc}
              >
                {tool.icon}
                <span className="text-[6px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-1">{tool.desc}</span>
              </button>
            ))}
          </div>

          <div className={`${vertical ? 'w-6 h-px my-1' : 'w-px h-6 mx-1'} bg-stone-700 self-center`} />
          
          <button 
            onClick={onClearMarks}
            className="p-2 text-stone-500 hover:text-white hover:bg-stone-800 rounded-lg transition-colors flex items-center justify-center"
            title="Clear All Coding"
          >
            <Scissors className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

export default CodingTray;