import React from 'react';
import { WordCard } from '../../types';

interface GenericTextProps {
  title: string;
  description?: string;
  content?: string;
  list?: string[];
  cards?: WordCard[]; // For reading lists
}

const GenericText: React.FC<GenericTextProps> = ({ title, description, content, list, cards }) => {
  return (
    <div className="min-h-full p-8 flex flex-col bg-white">
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
        {description && <p className="text-gray-500">{description}</p>}
      </div>

      <div className="flex-1 max-w-4xl">
        {content && (
          <div className="prose prose-lg text-gray-700 whitespace-pre-wrap mb-8 bg-yellow-50 p-6 rounded-lg border border-yellow-100 shadow-sm">
            {content}
          </div>
        )}

        {list && list.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((item, idx) => (
              <li key={idx} className="bg-gray-50 p-4 rounded border border-gray-100 text-lg text-gray-800 font-medium">
                {item}
              </li>
            ))}
          </ul>
        )}

        {cards && cards.length > 0 && (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {cards.map((c, idx) => (
               <div key={idx} className="p-4 bg-white border-2 border-gray-100 rounded-lg text-center shadow-sm hover:border-blue-100 transition-colors">
                 <div className="text-xl font-bold text-gray-800">{c.text}</div>
                 <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{c.type}</div>
               </div>
             ))}
           </div>
        )}
        
        {(!content && (!list || list.length === 0) && (!cards || cards.length === 0)) && (
          <div className="text-gray-400 italic p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
            No content provided for this section.
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericText;