import React from 'react';
import { CloudSun, Plane, Flower, Bug } from 'lucide-react';

interface HandwritingGridProps {
  rows: number;
  columns?: number;
}

const HandwritingGrid: React.FC<HandwritingGridProps> = ({ rows, columns = 1 }) => {
  return (
    <div className={`grid grid-cols-${columns} gap-x-12 gap-y-6 w-full px-4`}>
      {Array.from({ length: rows * columns }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col justify-between py-2 w-6 shrink-0 opacity-40">
             <CloudSun className="w-5 h-5 text-blue-500" />
             <Plane className="w-5 h-5 text-stone-500" />
             <Flower className="w-5 h-5 text-green-600" />
             <Bug className="w-5 h-5 text-amber-800" />
          </div>

          <div className="relative h-24 md:h-32 flex-1 group">
             <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-stone-300 font-serif text-xl italic font-black">{(i % rows) + 1}</div>
             <div className="absolute top-[10%] left-0 right-0 border-t-2 border-blue-400/60" title="Sky Line"></div>
             <div className="absolute top-[40%] left-0 right-0 border-t-2 border-dashed border-stone-300" title="Plane Line"></div>
             <div className="absolute top-[70%] left-0 right-0 border-t-4 border-green-600/50" title="Grass Line"></div>
             <div className="absolute top-[95%] left-0 right-0 border-t-2 border-dashed border-amber-900/20" title="Worm Line"></div>
             <div className="absolute inset-0 bg-stone-50 opacity-0 group-hover:opacity-100 -z-10 transition-opacity rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HandwritingGrid;
