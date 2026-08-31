import { WRS_PHONEME_MAP } from './wrsKnowledgeBase';
import { SPELLING_OPTIONS } from './spellingOptions';

export interface GraphemeIntroduction {
  step: number;
  substep: number;
  category: string;
  subtype: string;
  content: string;
  keyword?: string; 
  meaning?: string;
}

/**
 * Robust comparison for WRS Substeps (Step.Substep)
 */
export const isSubstepAtLeast = (targetStep: number, targetSubstep: number, introduced: string): boolean => {
  const [introStep, introSub] = introduced.split('.').map(Number);
  if (targetStep > introStep) return true;
  if (targetStep < introStep) return false;
  return targetSubstep >= introSub;
};

/**
 * LATIN BASES (Roots)
 * Source: Unified Word Element Master Registry
 */
const MASTER_LATIN_BASES: GraphemeIntroduction[] = [
  // --- STEP 2.4 ---
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "fess", meaning: "acknowledge" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "gress", meaning: "step, degree" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "mand", meaning: "order" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "mit", meaning: "send" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "pel", meaning: "drive, push" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "pend", meaning: "hang, weigh" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "press", meaning: "press, push against" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "rupt", meaning: "break" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "sent", meaning: "feel, perceive" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "sist", meaning: "place, stand" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "stant", meaning: "standing" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "sult", meaning: "leap, assault" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "tend", meaning: "stretch, reach" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "tent", meaning: "stretch, reach" },
  { step: 2, substep: 4, category: "Base", subtype: "Latin", content: "vent", meaning: "come" },

  // --- STEP 2.5 ---
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "dict", meaning: "say, tell" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "duct", meaning: "lead" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "fect", meaning: "make, do" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "flect", meaning: "bend, curve" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "flict", meaning: "strike to ground" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "ject", meaning: "throw" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "lect", meaning: "gather, choose, read" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "pact", meaning: "fastened, agreed" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "rect", meaning: "ruled, sight" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "sect", meaning: "cut" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "spect", meaning: "look, see" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "struct", meaning: "build" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "tact", meaning: "touch" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "tract", meaning: "draw" },
  { step: 2, substep: 5, category: "Base", subtype: "Latin", content: "vict", meaning: "conquer" },

  // --- STEP 4.1 (V-E BASES) ---
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "clude", meaning: "close" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "fuse", meaning: "pour" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "pose", meaning: "put, set" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "pute", meaning: "think, reckon" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "quire", meaning: "ask, seek" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "scribe", meaning: "write" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "spire", meaning: "breath of life" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "sume", meaning: "take" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "vise", meaning: "see" },
  { step: 4, substep: 1, category: "Base", subtype: "Latin", content: "voke", meaning: "call, voice" },

  // --- STEP 7.1 ---
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "cept", meaning: "take, seize, hold" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "cess", meaning: "go, yield" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "scend", meaning: "climb" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "sess", meaning: "to sit" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "cede", meaning: "go, yield" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "cide", meaning: "cut, kill, slay" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "cise", meaning: "cut, kill, slay" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "cite", meaning: "call, arouse" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "duce", meaning: "lead, bring" },
  { step: 7, substep: 1, category: "Base", subtype: "Latin", content: "side", meaning: "to sit" },

  // --- STEP 8.1 ---
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "fer", meaning: "to carry, bring" },
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "firm", meaning: "strong, steady" },
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "form", meaning: "to form, shape" },
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "part", meaning: "part, divide" },
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "port", meaning: "to carry" },
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "serve", meaning: "to watch, protect" },
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "vert", meaning: "to turn" },
  { step: 8, substep: 1, category: "Base", subtype: "Latin", content: "vers", meaning: "to turn" },

  // --- ADVANCED BASES ---
  { step: 9, substep: 1, category: "Base", subtype: "Latin", content: "tain", meaning: "to hold" },
  { step: 9, substep: 2, category: "Base", subtype: "Latin", content: "ceed", meaning: "to go, yield" },
  { step: 9, substep: 6, category: "Base", subtype: "Latin", content: "crease", meaning: "to grow" },
  { step: 11, substep: 4, category: "Base", subtype: "Latin", content: "ceive", meaning: "take, seize, hold" },
  { step: 12, substep: 2, category: "Base", subtype: "Latin", content: "sign", meaning: "sign, to mark" }
];

/**
 * GREEK COMBINING FORMS
 */
const MASTER_GREEK_FORMS: GraphemeIntroduction[] = [
  // --- STEP 7.3 ---
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "astro", meaning: "star, constellation" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "gram", meaning: "written characters" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "graph", meaning: "drawn or written" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "logy", meaning: "study of" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "micro", meaning: "small" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "mono", meaning: "one" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "path", meaning: "feeling, suffering" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "phone", meaning: "sound" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "photo", meaning: "light" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "scope", meaning: "instrument for viewing" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "sphere", meaning: "globe or ball" },
  { step: 7, substep: 3, category: "Base", subtype: "Greek", content: "tele", meaning: "afar, distant" },

  // --- STEP 8.3 ---
  { step: 8, substep: 3, category: "Base", subtype: "Greek", content: "meter", meaning: "to measure" },
  { step: 8, substep: 3, category: "Base", subtype: "Greek", content: "metry", meaning: "to measure" },
  { step: 8, substep: 3, category: "Base", subtype: "Greek", content: "therm", meaning: "heat" },

  // --- STEP 11.1 ---
  { step: 11, substep: 1, category: "Base", subtype: "Greek", content: "hydro", meaning: "water" },

  // --- STEP 11.5 ---
  { step: 11, substep: 5, category: "Base", subtype: "Greek", content: "bio", meaning: "life" },
  { step: 11, substep: 5, category: "Base", subtype: "Greek", content: "mania", meaning: "excessive excitement" },
  { step: 11, substep: 5, category: "Base", subtype: "Greek", content: "phobia", meaning: "fear" },

  // --- STEP 12.1 ---
  { step: 12, substep: 1, category: "Base", subtype: "Greek", content: "ge", meaning: "earth" },

  // --- STEP 12.4 ---
  { step: 12, substep: 4, category: "Base", subtype: "Greek", content: "chron", meaning: "time" },
  { step: 12, substep: 4, category: "Base", subtype: "Greek", content: "psych", meaning: "spirit, soul" }
];

/**
 * AFFIX REGISTRY
 */
const MASTER_AFFIXES: GraphemeIntroduction[] = [
  // --- STEP 1 ---
  { step: 1, substep: 6, category: "Affix", subtype: "Suffix", content: "-s" },
  { step: 1, substep: 6, category: "Affix", subtype: "Suffix", content: "-es" },
  
  // --- STEP 3 ---
  { step: 3, substep: 1, category: "Affix", subtype: "Prefix", content: "mid-" },
  { step: 3, substep: 1, category: "Affix", subtype: "Prefix", content: "mis-" },
  { step: 3, substep: 1, category: "Affix", subtype: "Prefix", content: "non-" },
  { step: 3, substep: 1, category: "Affix", subtype: "Prefix", content: "trans-" },
  { step: 3, substep: 1, category: "Affix", subtype: "Prefix", content: "un-" },

  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "ab-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "ad-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "con-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "com-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "dis-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "en-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "em-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "ex-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "in-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "im-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "ob-" },
  { step: 3, substep: 2, category: "Affix", subtype: "Prefix", content: "sub-" },

  { step: 3, substep: 5, category: "Affix", subtype: "Suffix", content: "-ed" },
  { step: 3, substep: 5, category: "Affix", subtype: "Suffix", content: "-ing" },

  // --- STEP 4 ---
  { step: 4, substep: 4, category: "Affix", subtype: "Suffix", content: "-ive" },

  // --- STEP 5 ---
  { step: 5, substep: 1, category: "Affix", subtype: "Prefix", content: "co-" },
  { step: 5, substep: 1, category: "Affix", subtype: "Prefix", content: "de-" },
  { step: 5, substep: 1, category: "Affix", subtype: "Prefix", content: "e-" },
  { step: 5, substep: 1, category: "Affix", subtype: "Prefix", content: "pre-" },
  { step: 5, substep: 1, category: "Affix", subtype: "Prefix", content: "pro-" },
  { step: 5, substep: 1, category: "Affix", subtype: "Prefix", content: "re-" },
  { step: 5, substep: 5, category: "Affix", subtype: "Prefix", content: "a-" },

  // --- STEP 6 ---
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-ful" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-less" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-ly" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-ment" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-ness" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-ty" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-able" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-en" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-er" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-est" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-ish" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-or" },
  { step: 6, substep: 1, category: "Affix", subtype: "Suffix", content: "-y" },

  // --- STEP 7-12 ---
  { step: 7, substep: 4, category: "Affix", subtype: "Suffix", content: "-ion" },
  { step: 8, substep: 5, category: "Affix", subtype: "Suffix", content: "-ward" },
  
  { step: 10, substep: 1, category: "Affix", subtype: "Suffix", content: "-ace" },
  { step: 10, substep: 1, category: "Affix", subtype: "Suffix", content: "-age" },
  { step: 10, substep: 1, category: "Affix", subtype: "Suffix", content: "-ate" },
  { step: 10, substep: 1, category: "Affix", subtype: "Suffix", content: "-ice" },
  { step: 10, substep: 1, category: "Affix", subtype: "Suffix", content: "-ile" },
  { step: 10, substep: 1, category: "Affix", subtype: "Suffix", content: "-ine" },
  { step: 10, substep: 1, category: "Affix", subtype: "Suffix", content: "-ite" },

  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ary" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ery" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ory" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ic" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ism" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ist" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ity" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ize" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ant" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ance" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ancy" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ent" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ence" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ency" },
  { step: 10, substep: 5, category: "Affix", subtype: "Suffix", content: "-ible" },

  { step: 12, substep: 5, category: "Affix", subtype: "Suffix", content: "-al" },
  { step: 12, substep: 5, category: "Affix", subtype: "Suffix", content: "-an" },
  { step: 12, substep: 5, category: "Affix", subtype: "Suffix", content: "-ous" },
  { step: 12, substep: 5, category: "Affix", subtype: "Suffix", content: "-ure" }
];

/**
 * DYNAMIC GRAPHEME REGISTRY
 */
export const MASTER_GRAPHEMES: GraphemeIntroduction[] = (() => {
  const list: GraphemeIntroduction[] = [];

  // 1. Process standard sounds from WRS_PHONEME_MAP
  Object.entries(WRS_PHONEME_MAP).forEach(([category, phonemes]) => {
    phonemes.forEach((entry: any) => {
      const [step, substep] = entry.introduced.split('.').map(Number);
      entry.graphemes.forEach((g: string) => {
        list.push({
          step,
          substep,
          category: "Grapheme",
          subtype: category,
          content: g,
          keyword: entry.keyword 
        });
      });
    });
  });

  // 2. Return combined list
  return [...list, ...MASTER_AFFIXES, ...MASTER_LATIN_BASES, ...MASTER_GREEK_FORMS];
})();

export const getPhonemeForGrapheme = (grapheme: string): string | null => {
  const cleanG = grapheme.toLowerCase().replace(/^-/, '').replace(/-$/, '');
  for (const category of Object.values(WRS_PHONEME_MAP)) {
    const match = category.find(p => p.graphemes.includes(cleanG));
    if (match) return match.phoneme;
  }
  return null;
};

/**
 * Returns valid spelling options for a sound at a specific curriculum point.
 */
export const getOptionsForPhoneme = (phoneme: string, currentStep: number, currentSubstep: number): string[] => {
  const searchKey = phoneme.startsWith('/') ? phoneme : `/${phoneme}/`;
  const entries = SPELLING_OPTIONS[searchKey];
  
  if (!entries) return [];

  return entries
    .filter(opt => isSubstepAtLeast(currentStep, currentSubstep, opt.introduced))
    .map(opt => opt.grapheme);
};

const WRS_DICT = {
  welded: ['all', 'am', 'an', 'ang', 'ing', 'ong', 'ung', 'ank', 'ink', 'onk', 'unk', 'ild', 'ind', 'old', 'ost', 'olt', 'stle', 'tion', 'sion', 'sure', 'ture', 'tious', 'cious', 'tial', 'cial', 'tient', 'cient', 'cian'],
  digraphs: ['sh', 'ch', 'th', 'wh', 'ck', 'ph', 'wr', 'kn', 'gn', 'mb', 'tch', 'dge', 'qu', 'gh', 'rh', 'mn'],
  vowels: ['a', 'e', 'i', 'o', 'u', 'y', 'ai', 'ay', 'ee', 'ea', 'ey', 'oa', 'oe', 'ue', 'oi', 'oy', 'au', 'aw', 'ou', 'ow', 'oo', 'ie', 'ei', 'igh', 'eigh', 'ar', 'or', 'er', 'ir', 'ur', 'eu', 'ui'],
  consonants: ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z']
};

export const getTilesForStep = (targetStepStr: string, targetSubstepStr: string) => {
  const targetStep = parseInt(targetStepStr, 10);
  const targetSubstep = parseInt(targetSubstepStr, 10);

  const unlocked = MASTER_GRAPHEMES.filter(g => 
    isSubstepAtLeast(targetStep, targetSubstep, `${g.step}.${g.substep}`)
  );

  const banks: Record<string, string[]> = {
    vowels: [],
    digraphs: [],
    welded_ng: [],
    welded_nk: [],
    welded_standard: [],
    welded_exceptions: [],
    consonants: [],
    suffixes: [],
    prefixes: [],
    latin_bases: [],
    greek_forms: []
  };

  const FAMILIES = {
    ng: ['ang', 'ing', 'ong', 'ung'],
    nk: ['ank', 'ink', 'onk', 'unk'],
    std: ['all', 'am', 'an'],
    exc: ['ild', 'ind', 'old', 'ost', 'olt', 'stle', 'tion', 'sion', 'sure', 'ture', 'tious', 'cious', 'tial', 'cial', 'tient', 'cient', 'cian']
  };

  unlocked.forEach(g => {
    const val = g.content.toLowerCase();

    if (g.category === "Base") {
      if (g.subtype === "Latin") {
        if (!banks.latin_bases.includes(val)) banks.latin_bases.push(val);
      } else {
        if (!banks.greek_forms.includes(val)) banks.greek_forms.push(val);
      }
    } else if (val.startsWith('-') || g.subtype === "Suffix") {
      const cleanVal = val.replace(/^-/, '');
      if (!banks.suffixes.includes(cleanVal)) banks.suffixes.push(cleanVal);
    } else if (val.endsWith('-') || g.subtype === "Prefix") {
      const cleanVal = val.replace(/-$/, '');
      if (!banks.prefixes.includes(cleanVal)) banks.prefixes.push(cleanVal);
    } else {
      const cleanVal = val;
      if (FAMILIES.ng.includes(cleanVal)) {
        if (!banks.welded_ng.includes(cleanVal)) banks.welded_ng.push(cleanVal);
      } else if (FAMILIES.nk.includes(cleanVal)) {
        if (!banks.welded_nk.includes(cleanVal)) banks.welded_nk.push(cleanVal);
      } else if (FAMILIES.std.includes(cleanVal)) {
        if (!banks.welded_standard.includes(cleanVal)) banks.welded_standard.push(cleanVal);
      } else if (FAMILIES.exc.includes(cleanVal)) {
        if (!banks.welded_exceptions.includes(cleanVal)) banks.welded_exceptions.push(cleanVal);
      } else if (WRS_DICT.digraphs.includes(cleanVal)) {
        if (!banks.digraphs.includes(cleanVal)) banks.digraphs.push(cleanVal);
      } else if (WRS_DICT.vowels.includes(cleanVal)) {
        if (!banks.vowels.includes(cleanVal)) banks.vowels.push(cleanVal);
      } else {
        if (!banks.consonants.includes(cleanVal)) banks.consonants.push(cleanVal);
      }
    }
  });

  return banks;
};