import React, { memo } from 'react';
import { TileData, getTileColor } from '../utils';

interface TileProps {
  data: TileData;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rounding?: 'all' | 'left' | 'right' | 'none';
}

interface EncodedPart2Tile {
  role: string;
  text: string;
}

const PART2_PREFIX = '§p2:';

const decodePart2Tile = (data: TileData): EncodedPart2Tile | null => {
  if (data.type !== 'syllable' || !data.text.startsWith(PART2_PREFIX)) return null;
  const remainder = data.text.slice(PART2_PREFIX.length);
  const separator = remainder.indexOf(':');
  if (separator < 0) return null;
  const role = remainder.slice(0, separator);
  try {
    return {
      role,
      text: decodeURIComponent(remainder.slice(separator + 1))
    };
  } catch {
    return null;
  }
};

const part2Color = (role: string) => {
  switch (role) {
    case 'vowel':
    case 'vowel-team':
    case 'r-controlled':
      return 'bg-[#f4a291] border-[#d88272]';
    case 'welded':
      return 'bg-[#b8dfb5] border-[#8cbd89]';
    case 'prefix':
    case 'suffix':
      return 'bg-[#fff0a8] border-[#dccb76]';
    case 'base-element':
    case 'greek-combining-form':
      return 'bg-stone-200 border-stone-400';
    case 'syllable':
      return 'bg-[#fffaf0] border-stone-300';
    case 'consonant':
    case 'consonant-digraph':
    default:
      return 'bg-[#fff4cc] border-[#e2d19a]';
  }
};

const Tile: React.FC<TileProps> = ({ data, size = 'md', rounding = 'all' }) => {
  if (data.type === 'space') {
    const spaceSizes = {
      sm: 'w-2',
      md: 'w-4',
      lg: 'w-6',
      xl: 'w-8',
      '2xl': 'w-10'
    };
    return <div className={`${spaceSizes[size]} h-full transition-all`} />;
  }

  if (data.type === 'symbol') {
    const symbolSizes = {
      sm: 'text-sm px-1',
      md: 'text-2xl px-2',
      lg: 'text-4xl px-3',
      xl: 'text-5xl px-4',
      '2xl': 'text-7xl px-5'
    };
    return (
      <div className={`h-full flex items-center justify-center font-black ${symbolSizes[size]} text-stone-400 select-none`}>
        {data.text}
      </div>
    );
  }

  const part2Tile = decodePart2Tile(data);

  if (part2Tile?.role === 'divider') {
    return <div data-part2-role="divider" className="h-24 w-px bg-stone-300 mx-8 shrink-0" />;
  }

  if (part2Tile?.role === 'symbol') {
    const symbolSizes = {
      sm: 'text-sm px-1',
      md: 'text-2xl px-2',
      lg: 'text-4xl px-3',
      xl: 'text-5xl px-4',
      '2xl': 'text-7xl px-5'
    };
    return (
      <div
        data-part2-role="symbol"
        className={`h-full flex items-center justify-center font-black ${symbolSizes[size]} text-stone-400 select-none`}
      >
        {part2Tile.text}
      </div>
    );
  }

  if (part2Tile?.role === 'statement' || part2Tile?.role === 'notebook') {
    const notebook = part2Tile.role === 'notebook';
    return (
      <div
        data-part2-role={part2Tile.role}
        className={`
          w-[1200px] max-w-[1200px] min-h-[190px] px-16 py-12
          flex items-center justify-center text-center
          rounded-2xl border-2 shadow-sm
          ${notebook ? 'bg-[#fffaf0] border-[#dfd2b5]' : 'bg-white/80 border-stone-200'}
        `}
        style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
      >
        <span className="text-5xl font-bold leading-tight text-stone-900 whitespace-pre-wrap break-words max-w-[1080px]">
          {part2Tile.text}
        </span>
      </div>
    );
  }

  const displayText = part2Tile?.text ?? data.text;

  const getStandardWidth = (text: string, currentSize: string) => {
    const len = text.length;
    if (currentSize === 'sm') {
      if (len <= 1) return 'w-10';
      if (len <= 2) return 'w-14';
      return 'min-w-[4rem] w-auto';
    }
    if (currentSize === 'md') {
      if (len <= 1) return 'w-16';
      if (len <= 2) return 'w-24';
      return 'min-w-[8rem] w-auto';
    }
    if (currentSize === 'lg') {
      if (len <= 1) return 'w-24';
      if (len <= 2) return 'w-32';
      return 'min-w-[10rem] w-auto';
    }
    if (currentSize === 'xl') {
      if (len <= 1) return 'w-28';
      if (len <= 2) return 'w-40';
      return 'min-w-[12rem] w-auto';
    }
    if (currentSize === '2xl') {
      if (len <= 1) return 'w-36';
      if (len <= 2) return 'w-48';
      return 'min-w-[14rem] w-auto';
    }
    return 'w-auto px-4';
  };

  const sizeClasses = {
    sm: 'h-10 text-base border-b-2',
    md: 'h-16 text-2xl border-b-2',
    lg: 'h-24 text-4xl border-b-4',
    xl: 'h-28 text-5xl border-b-4',
    '2xl': 'h-36 text-7xl border-b-4',
  };

  const roundingClasses = {
    all: 'rounded-md',
    left: 'rounded-l-md rounded-r-none',
    right: 'rounded-r-md rounded-l-none',
    none: 'rounded-none'
  };

  return (
    <div
      data-part2-role={part2Tile?.role}
      className={`
        ${sizeClasses[size]}
        ${getStandardWidth(displayText, size)}
        ${part2Tile ? part2Color(part2Tile.role) : getTileColor(data.type)}
        relative
        flex items-center justify-center
        font-black
        text-stone-900
        border-r border-l border-t
        ${roundingClasses[rounding]}
        shadow-sm
        select-none
        cursor-default
        transition-all
      `}
      style={{
        fontFamily: '"Inter", system-ui, sans-serif'
      }}
    >
      {!part2Tile && (
        <div className={`absolute inset-0 bg-white/10 pointer-events-none ${roundingClasses[rounding]} opacity-0 hover:opacity-100 transition-opacity`}></div>
      )}
      <span className="z-10 leading-none whitespace-nowrap overflow-visible px-2">{displayText}</span>
    </div>
  );
};

export default memo(Tile);