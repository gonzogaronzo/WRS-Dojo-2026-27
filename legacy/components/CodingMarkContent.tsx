import React from 'react';
import { Star } from 'lucide-react';
import { CodingMark } from './modules/CodingTray';

interface CodingMarkContentProps {
  mark: CodingMark;
  variant?: 'large' | 'small';
}

const CodingMarkContent: React.FC<CodingMarkContentProps> = ({ mark, variant = 'large' }) => {
  const commonStyles = "text-stone-950 font-black drop-shadow-md select-none pointer-events-none";
  const smallStyles = "text-red-700 font-black drop-shadow-lg select-none pointer-events-none transition-colors";
  
  const styles = variant === 'small' ? smallStyles : commonStyles;

  switch (mark.type) {
    case 'macron': return <span className={`${styles} ${variant === 'large' ? 'text-5xl' : 'text-5xl'} leading-none`}>¯</span>;
    case 'breve': return <span className={`${styles} ${variant === 'large' ? 'text-5xl' : 'text-5xl'} leading-none`}>˘</span>;
    case 'cross': return <span className={`${styles} ${variant === 'large' ? 'text-6xl text-red-700 opacity-90' : 'text-6xl opacity-90'} leading-none`}>×</span>;
    case 'star': return <Star className={`${variant === 'large' ? 'w-12 h-12' : 'w-10 h-10'} ${variant === 'large' ? 'text-amber-500' : 'text-red-600'} fill-current drop-shadow-md`} />;
    case 'scoop': return <span className={`${styles} ${variant === 'large' ? 'text-8xl font-light italic' : 'text-[5rem] font-medium'} leading-none`}>⌣</span>;
    case 'accent': return <span className={`${styles} ${variant === 'large' ? 'text-5xl' : 'text-5xl'} leading-none`}>´</span>;
    case 'dot': return <span className={`${styles} ${variant === 'large' ? 'text-6xl' : 'text-6xl'} leading-none`}>·</span>;
    default: return null;
  }
};

export default CodingMarkContent;
