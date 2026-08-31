import { Lesson } from './types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Fix: Added parseLessonText utility to support "Smart Import" feature in LessonForm.
// This parser scans raw text for headers and extracts sounds, words, and sentences into a Lesson object.
export const parseLessonText = (text: string, step: string, substep: string): Partial<Lesson> => {
  const result: any = {
    quickDrill: [],
    wordCards: [],
    sentences: [],
    hfwList: [],
    dictation: {
      sounds: [],
      realWords: [],
      wordElements: [],
      nonsenseWords: [],
      phrases: [],
      sentences: []
    },
    passage: ''
  };

  const lines = text.split('\n');
  let currentSection = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect start of common WRS lesson sections
    if (/^sounds?:/i.test(trimmed)) { currentSection = 'sounds'; return; }
    if (/^word cards?:/i.test(trimmed) || /^real words:/i.test(trimmed)) { currentSection = 'words'; return; }
    if (/^nonsense words?:/i.test(trimmed)) { currentSection = 'nonsense'; return; }
    if (/^sentences?:/i.test(trimmed)) { currentSection = 'sentences'; return; }
    if (/^hfw:|sight words:/i.test(trimmed)) { currentSection = 'hfw'; return; }
    if (/^passage:/i.test(trimmed)) { currentSection = 'passage'; return; }
    
    // Dictation sub-sections (Wilson Part 8)
    if (/^dictation sounds?:/i.test(trimmed)) { currentSection = 'd-sounds'; return; }
    if (/^dictation words?:/i.test(trimmed)) { currentSection = 'd-words'; return; }
    if (/^dictation elements?:/i.test(trimmed)) { currentSection = 'd-elements'; return; }
    if (/^dictation nonsense?:/i.test(trimmed)) { currentSection = 'd-nonsense'; return; }
    if (/^dictation phrases?:/i.test(trimmed)) { currentSection = 'd-phrases'; return; }
    if (/^dictation sentences?:/i.test(trimmed)) { currentSection = 'd-sentences'; return; }

    // Process items based on active section
    const rawItems = trimmed.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const items = Array.from(new Set(rawItems));

    switch (currentSection) {
      case 'sounds':
        items.forEach(s => {
          if (!result.quickDrill.includes(s)) result.quickDrill.push(s);
        });
        break;
      case 'words':
        items.forEach(w => {
          if (!result.wordCards.find((c: any) => c.text === w)) {
            result.wordCards.push({ id: generateId(), text: w, type: 'regular' });
          }
        });
        break;
      case 'nonsense':
        items.forEach(w => {
          if (!result.wordCards.find((c: any) => c.text === w)) {
            result.wordCards.push({ id: generateId(), text: w, type: 'nonsense' });
          }
        });
        break;
      case 'sentences':
        if (items.length > 1) {
          items.forEach(s => {
            if (!result.sentences.includes(s)) result.sentences.push(s);
          });
        } else {
          if (!result.sentences.includes(trimmed)) result.sentences.push(trimmed);
        }
        break;
      case 'hfw':
        items.forEach(w => {
          if (!result.hfwList.includes(w)) result.hfwList.push(w);
        });
        break;
      case 'passage':
        result.passage += (result.passage ? '\n' : '') + trimmed;
        break;
      case 'd-sounds':
        result.dictation.sounds.push(...items);
        break;
      case 'd-words':
        result.dictation.realWords.push(...items);
        break;
      case 'd-elements':
        result.dictation.wordElements.push(...items);
        break;
      case 'd-nonsense':
        result.dictation.nonsenseWords.push(...items);
        break;
      case 'd-phrases':
        result.dictation.phrases.push(...items);
        break;
      case 'd-sentences':
        result.dictation.sentences.push(trimmed);
        break;
    }
  });

  return result;
};

export interface TileData {
  text: string;
  type: 'consonant' | 'vowel' | 'vowelTeam' | 'digraph' | 'welded' | 'suffix' | 'rControl' | 'prefix' | 'syllable' | 'space' | 'symbol';
  startIndex?: number;
  endIndex?: number;
}

const WELDED_SOUNDS = [
  'ang', 'ing', 'ong', 'ung', 'ank', 'ink', 'onk', 'unk',
  'all', 'ild', 'ind', 'old', 'ost', 'olt', 'ive', 'am', 'an', 'stle', 
  'tion', 'sion', 'sure', 'ture', 'tious', 'cious', 'tial', 'cial', 'tient', 'cient', 'cian'
].sort((a, b) => b.length - a.length);

const VOWEL_TEAMS = [
  'eigh', 'igh', 'ai', 'ay', 'ee', 'ea', 'ey', 'oi', 'oy', 
  'oa', 'oe', 'ow', 'ou', 'oo', 'ue', 'ew', 'au', 'aw', 'ie', 'ei', 'ui', 'eu'
].sort((a, b) => b.length - a.length);

const R_CONTROLLED = ['ar', 'or', 'er', 'ir', 'ur'].sort((a, b) => b.length - a.length);

const DIGRAPHS = [
  'tch', 'dge', 'sh', 'ch', 'th', 'wh', 'ck', 'ph', 'qu', 'wr', 'kn', 'gn', 'mb', 'gh', 'rh', 'mn'
].sort((a, b) => b.length - a.length);

const VOWELS = ['a', 'e', 'i', 'o', 'u'];

export const parseWordToTiles = (word: string): TileData[] => {
  const tiles: TileData[] = [];
  let remaining = word; 
  let currentIndex = 0;

  while (remaining.length > 0) {
    const start = currentIndex;
    
    if (remaining.startsWith(' ')) {
        tiles.push({ text: '', type: 'space', startIndex: start, endIndex: start + 1 });
        remaining = remaining.slice(1);
        currentIndex += 1;
        continue;
    }

    // Symbols like +, →, ->
    if (remaining.startsWith('+') || remaining.startsWith('→')) {
        tiles.push({ text: remaining[0], type: 'symbol', startIndex: start, endIndex: start + 1 });
        remaining = remaining.slice(1);
        currentIndex += 1;
        continue;
    }
    if (remaining.startsWith('->')) {
        tiles.push({ text: '→', type: 'symbol', startIndex: start, endIndex: start + 2 });
        remaining = remaining.slice(2);
        currentIndex += 2;
        continue;
    }

    const syllableMatch = remaining.match(/^\|([^|]*)\|/);
    if (syllableMatch) {
        const fullMatch = syllableMatch[0];
        tiles.push({ 
          text: syllableMatch[1], 
          type: 'syllable', 
          startIndex: start, 
          endIndex: start + fullMatch.length 
        });
        remaining = remaining.substring(fullMatch.length);
        currentIndex += fullMatch.length;
        continue;
    }

    if (remaining.startsWith('<')) {
        const close = remaining.indexOf('>');
        if (close !== -1) {
            tiles.push({ 
              text: remaining.substring(1, close), 
              type: 'suffix', 
              startIndex: start, 
              endIndex: start + close + 1 
            });
            remaining = remaining.substring(close + 1);
            currentIndex += close + 1;
            continue;
        }
    }

    const suffixMatch = remaining.match(/^-([a-zA-Z0-9]+)/);
    if (suffixMatch) {
        tiles.push({ 
          text: suffixMatch[0], 
          type: 'suffix', 
          startIndex: start, 
          endIndex: start + suffixMatch[0].length 
        });
        remaining = remaining.substring(suffixMatch[0].length);
        currentIndex += suffixMatch[0].length;
        continue;
    }

    const prefixMatch = remaining.match(/^([a-zA-Z0-9]+)-/);
    if (prefixMatch) {
        tiles.push({ 
          text: prefixMatch[0], 
          type: 'prefix', 
          startIndex: start, 
          endIndex: start + prefixMatch[0].length 
        });
        remaining = remaining.substring(prefixMatch[0].length);
        currentIndex += prefixMatch[0].length;
        continue;
    }

    if (remaining.startsWith('[')) {
        const close = remaining.indexOf(']');
        if (close !== -1) {
            tiles.push({ 
              text: remaining.substring(1, close), 
              type: 'vowel', 
              startIndex: start, 
              endIndex: start + close + 1 
            });
            remaining = remaining.substring(close + 1);
            currentIndex += close + 1;
            continue;
        }
    }

    if (remaining.startsWith('{')) {
        const close = remaining.indexOf('}');
        if (close !== -1) {
            tiles.push({ 
              text: remaining.substring(1, close), 
              type: 'consonant', 
              startIndex: start, 
              endIndex: start + close + 1 
            });
            remaining = remaining.substring(close + 1);
            currentIndex += close + 1;
            continue;
        }
    }

    if (remaining.startsWith('/')) {
        const close = remaining.indexOf('/', 1);
        if (close !== -1) {
            tiles.push({ 
              text: remaining.substring(1, close), 
              type: 'welded', 
              startIndex: start, 
              endIndex: start + close + 1 
            });
            remaining = remaining.substring(close + 1);
            currentIndex += close + 1;
            continue;
        }
    }

    const current = remaining.toLowerCase();
    let matched = false;

    for (const welded of WELDED_SOUNDS) {
      if (current.startsWith(welded)) {
        tiles.push({ 
          text: remaining.substring(0, welded.length), 
          type: 'welded', 
          startIndex: start, 
          endIndex: start + welded.length 
        });
        remaining = remaining.slice(welded.length);
        currentIndex += welded.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    for (const vt of VOWEL_TEAMS) {
      if (current.startsWith(vt)) {
        tiles.push({ 
          text: remaining.substring(0, vt.length), 
          type: 'vowelTeam', 
          startIndex: start, 
          endIndex: start + vt.length 
        });
        remaining = remaining.slice(vt.length);
        currentIndex += vt.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    
    for (const rc of R_CONTROLLED) {
      if (current.startsWith(rc)) {
        tiles.push({ 
          text: remaining.substring(0, rc.length), 
          type: 'rControl', 
          startIndex: start, 
          endIndex: start + rc.length 
        }); 
        remaining = remaining.slice(rc.length);
        currentIndex += rc.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    for (const digraph of DIGRAPHS) {
      if (current.startsWith(digraph)) {
        tiles.push({ 
          text: remaining.substring(0, digraph.length), 
          type: 'digraph', 
          startIndex: start, 
          endIndex: start + digraph.length 
        });
        remaining = remaining.slice(digraph.length);
        currentIndex += digraph.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const char = remaining[0];
    const charLower = char.toLowerCase();
    if (VOWELS.includes(charLower)) {
      tiles.push({ text: char, type: 'vowel', startIndex: start, endIndex: start + 1 });
    } else {
      tiles.push({ text: char, type: 'consonant', startIndex: start, endIndex: start + 1 });
    }
    remaining = remaining.slice(1);
    currentIndex += 1;
  }

  return tiles;
};

/**
 * Splits a word into syllables based on common WRS patterns.
 * This is a heuristic-based splitter for educational visualization.
 */
export const splitIntoSyllables = (word: string): string[] => {
  if (!word) return [];
  const lower = word.toLowerCase();
  
  // Handle common multi-syllable words from the curriculum explicitly if needed
  const manualOverrides: Record<string, string[]> = {
    'decent': ['de', 'cent'],
    'giant': ['gi', 'ant'],
    'suggest': ['sug', 'gest'],
    'stingy': ['stin', 'gy'],
    'engage': ['en', 'gage'],
    'fancy': ['fan', 'cy'],
    'napkin': ['nap', 'kin'],
    'reptile': ['rep', 'tile'],
    'public': ['pub', 'lic'],
    'catnip': ['cat', 'nip'],
    'muffin': ['muf', 'fin'],
    'cobweb': ['cob', 'web'],
    'sunset': ['sun', 'set'],
    'plastic': ['plas', 'tic'],
    'dentist': ['den', 'tist'],
    'atlantic': ['at', 'lan', 'tic'],
    'magnetic': ['mag', 'ne', 'tic'],
    'fantastic': ['fan', 'tas', 'tic'],
    'disrupt': ['dis', 'rupt'],
    'expect': ['ex', 'pect'],
    'inspect': ['ins', 'pect'],
    'subject': ['sub', 'ject'],
    'object': ['ob', 'ject'],
    'project': ['pro', 'ject'],
    'reject': ['re', 'ject'],
    'inject': ['in', 'ject'],
    'eject': ['e', 'ject'],
  };

  if (manualOverrides[lower]) return manualOverrides[lower];

  // Basic heuristic for VCCV, VCV, etc.
  // This is a simplified version for UI purposes.
  const vowels = 'aeiouy';
  const syllables: string[] = [];
  let current = '';
  
  const isVowel = (c: string) => c && vowels.includes(c.toLowerCase());
  const isLetter = (c: string) => c && /[a-z]/i.test(c);

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    current += char;

    if (!isLetter(char)) continue;

    // Find next letter
    let nextIdx = i + 1;
    while (nextIdx < word.length && !isLetter(word[nextIdx])) nextIdx++;
    const next = word[nextIdx];

    // Find next next letter
    let nextNextIdx = nextIdx + 1;
    while (nextNextIdx < word.length && !isLetter(word[nextNextIdx])) nextNextIdx++;
    const nextNext = word[nextNextIdx];

    if (isVowel(char)) {
      // Check for VCCV
      if (next && !isVowel(next) && nextNext && !isVowel(nextNext)) {
        // Split between consonants unless it's a digraph
        const digraphs = ['sh', 'ch', 'th', 'wh', 'ck', 'ph'];
        if (!digraphs.includes(next.toLowerCase() + nextNext.toLowerCase())) {
          // Find the actual split point in the original string (after the first consonant)
          // We need to include any non-letters between char and next, and then include next.
          syllables.push(word.substring(i - (current.length - 1), nextIdx + 1));
          current = '';
          i = nextIdx; 
          continue;
        }
      }
      // Check for VCV (usually split before C)
      if (next && !isVowel(next) && nextNext && isVowel(nextNext)) {
        syllables.push(current);
        current = '';
        continue;
      }
    }
  }

  if (current) syllables.push(current);
  
  // Post-processing: if a syllable is just a consonant, merge it back
  const result: string[] = [];
  for (let i = 0; i < syllables.length; i++) {
    const s = syllables[i];
    if (s.length === 1 && !vowels.includes(s.toLowerCase()) && result.length > 0) {
      result[result.length - 1] += s;
    } else {
      result.push(s);
    }
  }

  return result.length > 0 ? result : [word];
};

export const getTileColor = (type: TileData['type']): string => {
  switch (type) {
    case 'vowel': 
    case 'vowelTeam':
    case 'rControl':
      return 'bg-[#f4a291] border-[#e88a75] text-stone-900'; // Vibrant Salmon
    case 'welded': 
      return 'bg-[#b6e2bb] border-[#93cd9a] text-stone-900'; // Green
    case 'suffix': 
    case 'prefix':
      return 'bg-[#fffbeb] border-[#fde68a] text-stone-900'; // Light Yellow/Gold
    case 'syllable':
      return 'bg-white border-stone-200 text-stone-900'; 
    case 'space':
      return 'bg-transparent border-transparent shadow-none';
    case 'symbol':
      return 'bg-transparent border-transparent shadow-none text-stone-300';
    case 'digraph': 
    case 'consonant': 
    default:
      return 'bg-[#ffed4a] border-[#e9c400] text-stone-900'; // Even more Vibrant Primary Yellow
  }
};