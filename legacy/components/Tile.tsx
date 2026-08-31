import React, { memo } from 'react';
import { TileData, getTileColor } from '../utils';

interface TileProps {
  data: TileData;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rounding?: 'all' | 'left' | 'right' | 'none';
}

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
      className={`
        ${sizeClasses[size]} 
        ${getStandardWidth(data.text, size)}
        ${getTileColor(data.type)} 
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
      <div className={`absolute inset-0 bg-white/10 pointer-events-none ${roundingClasses[rounding]} opacity-0 hover:opacity-100 transition-opacity`}></div>
      <span className="z-10 leading-none whitespace-nowrap overflow-visible px-2">{data.text}</span>
    </div>
  );
};

export default memo(Tile);