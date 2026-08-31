import React from 'react';
import { Scroll, Printer, Edit, Trash2, Plus, Play } from 'lucide-react';

interface MissionCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ElementType;
  onPrimaryAction: () => void;
  primaryActionLabel?: string;
  secondaryActions?: {
    icon: React.ElementType;
    onClick: () => void;
    title: string;
    variant?: 'default' | 'danger' | 'success';
  }[];
  children?: React.ReactNode;
}

const MissionCard: React.FC<MissionCardProps> = ({
  title,
  subtitle,
  badge,
  icon: Icon = Scroll,
  onPrimaryAction,
  primaryActionLabel = 'Deploy Mission',
  secondaryActions = [],
  children
}) => {
  return (
    <div className="bg-[#fdf6e3] text-stone-900 p-6 rounded-[2rem] border-4 border-stone-800 hover:border-red-800 transition-all shadow-xl group flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        {badge ? (
          <span className="text-[9px] font-black uppercase text-red-800 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 shadow-sm">
            {badge}
          </span>
        ) : <div />}
        <Icon className="w-5 h-5 text-stone-300 group-hover:text-red-800/40 transition-colors" />
      </div>

      <div className="flex-1">
        <h4 className="text-xl font-black font-serif leading-tight line-clamp-2 mb-1">{title}</h4>
        {subtitle && (
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{subtitle}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>

      <div className="flex gap-2 pt-6 mt-4 border-t border-stone-200/50">
        <button 
          onClick={onPrimaryAction} 
          className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-lg hover:bg-red-900 active:scale-95 transition-all"
        >
          <Play className="w-3 h-3 fill-current" />
          {primaryActionLabel}
        </button>
        
        {secondaryActions.map((action, idx) => (
          <button 
            key={idx}
            onClick={action.onClick} 
            className={`p-3 border-2 rounded-xl transition-all active:scale-90 ${
              action.variant === 'danger' 
                ? 'border-red-100 text-red-400 hover:text-red-800 hover:bg-red-50 hover:border-red-200' 
                : action.variant === 'success'
                ? 'border-emerald-100 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                : 'border-stone-200 text-stone-400 hover:text-stone-900 hover:bg-stone-100 hover:border-stone-300'
            }`}
            title={action.title}
          >
            <action.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default MissionCard;
