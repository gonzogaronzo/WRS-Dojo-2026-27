import React, { memo } from 'react';
import { TileData, getTileColor } from '../utils';
import {
  getWrsSemanticCardVisual,
  WRS_NEUTRAL_CARD_VISUALS,
  WRS_TILE_VISUALS,
  type WrsSemanticVisualRole
} from '../wrsVisualTokens';

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

const SEMANTIC_CARD_ROLES = new Set<WrsSemanticVisualRole>([
  'consonant',
  'consonant-digraph',
  'consonant-trigraph',
  'vowel',
  'vowel-team',
  'r-controlled',
  'welded',
  'prefix',
  'suffix',
  'base-element',
  'greek-combining-form'
]);

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

const sizeScale = (size: TileProps['size']) => {
  switch (size) {
    case 'sm': return 0.85;
    case 'md': return 1.25;
    case 'lg': return 1.85;
    case 'xl': return 2.45;
    case '2xl': return 3.1;
    default: return 1.25;
  }
};

const SemanticWilsonCard: React.FC<{
  role: WrsSemanticVisualRole;
  text: string;
  size: NonNullable<TileProps['size']>;
}> = ({ role, text, size }) => {
  const visual = getWrsSemanticCardVisual(role);
  const scale = sizeScale(size);
  const baseWidth = visual.kind === 'affix' || visual.kind === 'word-element'
    ? WRS_TILE_VISUALS.affixWidth
    : WRS_TILE_VISUALS.width;
  const fontSize = (visual.kind === 'affix' ? WRS_TILE_VISUALS.affixFontSize : WRS_TILE_VISUALS.fontSize) * scale;
  const contentWidth = visual.kind === 'word-element'
    ? Math.max(baseWidth * scale, text.length * fontSize * 0.62 + 32 * scale)
    : baseWidth * scale;

  return (
    <div
      data-part2-role={role}
      data-wrs-visual={visual.kind === 'tile' ? 'tileboard' : visual.kind}
      className="flex items-center justify-center select-none shrink-0"
      style={{
        width: contentWidth,
        height: WRS_TILE_VISUALS.height * scale,
        borderRadius: WRS_TILE_VISUALS.borderRadius * scale,
        border: WRS_TILE_VISUALS.border,
        boxShadow: WRS_TILE_VISUALS.shadow,
        background: visual.background,
        color: visual.color,
        fontFamily: WRS_TILE_VISUALS.fontFamily,
        fontWeight: WRS_TILE_VISUALS.fontWeight,
        fontSize,
        lineHeight: 1,
        paddingInline: visual.kind === 'word-element' ? 16 * scale : 4 * scale
      }}
    >
      <span className="whitespace-nowrap leading-none">{text}</span>
    </div>
  );
};

const SemanticWholeWord: React.FC<{ text: string }> = ({ text }) => (
  <div
    data-part2-role="word"
    data-wrs-visual="word-card"
    className="h-[118px] min-w-[250px] max-w-[430px] px-10 flex items-center justify-center shrink-0 select-none"
    style={{
      background: WRS_NEUTRAL_CARD_VISUALS.white,
      color: WRS_NEUTRAL_CARD_VISUALS.text,
      border: `2px solid ${WRS_NEUTRAL_CARD_VISUALS.border}`,
      borderRadius: WRS_NEUTRAL_CARD_VISUALS.radius,
      boxShadow: WRS_NEUTRAL_CARD_VISUALS.shadow,
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}
  >
    <span className="text-[52px] font-semibold leading-none whitespace-nowrap">{text}</span>
  </div>
);

const SemanticSyllableCard: React.FC<{ text: string }> = ({ text }) => (
  <div
    data-part2-role="syllable"
    data-wrs-visual="syllable-card"
    className="h-[112px] min-w-[210px] px-10 flex items-center justify-center shrink-0 select-none"
    style={{
      background: WRS_NEUTRAL_CARD_VISUALS.white,
      color: WRS_NEUTRAL_CARD_VISUALS.text,
      border: `2px solid ${WRS_NEUTRAL_CARD_VISUALS.border}`,
      borderRadius: WRS_NEUTRAL_CARD_VISUALS.radius,
      boxShadow: WRS_NEUTRAL_CARD_VISUALS.shadow,
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}
  >
    <span className="text-[56px] font-semibold leading-none whitespace-nowrap">{text}</span>
  </div>
);

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

  if (part2Tile?.role === 'row-break') {
    return <div data-part2-role="row-break" className="basis-full w-full h-0" />;
  }

  if (part2Tile?.role === 'step-label') {
    return (
      <div
        data-part2-role="step-label"
        className="basis-full w-full mb-1 mt-3 text-center text-[20px] leading-none font-bold uppercase tracking-[0.18em] text-stone-400 select-none"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {part2Tile.text}
      </div>
    );
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

  if (part2Tile?.role === 'word') return <SemanticWholeWord text={part2Tile.text} />;
  if (part2Tile?.role === 'syllable') return <SemanticSyllableCard text={part2Tile.text} />;

  if (part2Tile?.role === 'annotation') {
    return (
      <div
        data-part2-role="annotation"
        className="basis-full w-[1000px] max-w-[1000px] mt-7 text-center text-[34px] leading-tight font-semibold text-stone-600 select-none"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {part2Tile.text}
      </div>
    );
  }

  if (part2Tile?.role === 'statement') {
    return (
      <div
        data-part2-role="statement"
        className="w-[1120px] max-w-[1120px] px-8 py-5 text-center select-none"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <span className="text-[48px] font-semibold leading-tight text-stone-900 whitespace-pre-wrap break-words">
          {part2Tile.text}
        </span>
      </div>
    );
  }

  if (part2Tile?.role === 'notebook') {
    return (
      <div
        data-part2-role="notebook"
        data-wrs-visual="notebook-entry"
        className="w-[980px] max-w-[980px] min-h-[210px] px-14 py-10 flex items-center justify-center text-center select-none"
        style={{
          background: WRS_NEUTRAL_CARD_VISUALS.ivoryPaper,
          color: WRS_NEUTRAL_CARD_VISUALS.text,
          border: `2px solid ${WRS_NEUTRAL_CARD_VISUALS.border}`,
          borderRadius: 6,
          boxShadow: WRS_NEUTRAL_CARD_VISUALS.shadow,
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        <span className="text-[42px] font-semibold leading-snug whitespace-pre-wrap break-words max-w-[880px]">
          {part2Tile.text}
        </span>
      </div>
    );
  }

  if (part2Tile && SEMANTIC_CARD_ROLES.has(part2Tile.role as WrsSemanticVisualRole)) {
    return <SemanticWilsonCard role={part2Tile.role as WrsSemanticVisualRole} text={part2Tile.text} size={size} />;
  }

  if (part2Tile) {
    return (
      <div data-part2-role="invalid-visual-role" className="px-8 py-5 border-2 border-red-300 bg-red-50 text-red-900 text-2xl font-bold">
        Instructional display unavailable.
      </div>
    );
  }

  const displayText = data.text;

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
        ${getStandardWidth(displayText, size)}
        ${getTileColor(data.type)}
        relative flex items-center justify-center font-black text-stone-900
        border-r border-l border-t ${roundingClasses[rounding]} shadow-sm
        select-none cursor-default transition-all
      `}
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <div className={`absolute inset-0 bg-white/10 pointer-events-none ${roundingClasses[rounding]} opacity-0 hover:opacity-100 transition-opacity`} />
      <span className="z-10 leading-none whitespace-nowrap overflow-visible px-2">{displayText}</span>
    </div>
  );
};

export default memo(Tile);
