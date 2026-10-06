// Word Element Review Deck v1.2 — Wilson-source content, teacher-created review interface.
// Card fields are copied verbatim from the standalone deck (only `image` paths are rewritten).
// Generated from deck-data.js; do not hand-edit meanings, examples, or substeps.

export type WordElementFamily = 'Latin' | 'Greek';

export interface WordElementCard {
  id: string;
  family: WordElementFamily;
  elements: string[];
  related: string[];
  meaning: string;
  example: string;
  firstTaught: string;
  notebookSubstep: string;
  notebookCategory: string;
  sourceVolume: string;
  sourcePage: number;
  sourcePdfPage: number;
  image: string;
  sourceStatus: string;
  sourceBasis: string;
  auditFlags: string[];
  order: number;
}

export const WORD_ELEMENT_DECK_VERSION = "1.2";
export const WORD_ELEMENT_SOURCE_NOTE = "Element, meaning, example word, related bases, and mnemonic illustration are grounded in the supplied Fourth Edition Student Notebook Answer Keys. First-taught sequencing is source-verified where recorded in the manifest. The review interface, filters, and study modes are teacher-created.";

export const WORD_ELEMENT_SUBSTEPS: readonly string[] = ["1.1","1.2","1.3","1.4","1.5","1.6","2.1","2.2","2.3","2.4","2.5","3.1","3.2","3.3","3.4","3.5","4.1","4.2","4.3","4.4","5.1","5.2","5.3","5.4","5.5","6.1","6.2","6.3","6.4","7.1","7.2","7.3","7.4","7.5","8.1","8.2","8.3","8.4","8.5","9.1","9.2","9.3","9.4","9.5","9.6","9.7","10.1","10.2","10.3","10.4","10.5","10.6","11.1","11.2","11.3","11.4","11.5","12.1","12.2","12.3","12.4","12.5","12.6"];

export const WORD_ELEMENT_CARDS: readonly WordElementCard[] = [
  {
    "id": "latin_26_01",
    "family": "Latin",
    "elements": [
      "-fess-"
    ],
    "related": [],
    "meaning": "acknowledge",
    "example": "confess",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 26,
    "sourcePdfPage": 30,
    "image": "/word-element-mnemonics/latin_26_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 1
  },
  {
    "id": "latin_26_02",
    "family": "Latin",
    "elements": [
      "-gress-"
    ],
    "related": [
      "grad(e)",
      "gred"
    ],
    "meaning": "step, degree",
    "example": "congress",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 26,
    "sourcePdfPage": 30,
    "image": "/word-element-mnemonics/latin_26_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 2
  },
  {
    "id": "latin_26_03",
    "family": "Latin",
    "elements": [
      "-mand-"
    ],
    "related": [],
    "meaning": "order",
    "example": "command",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 26,
    "sourcePdfPage": 30,
    "image": "/word-element-mnemonics/latin_26_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 3
  },
  {
    "id": "latin_26_04",
    "family": "Latin",
    "elements": [
      "-mit-"
    ],
    "related": [
      "miss",
      "mitt"
    ],
    "meaning": "send",
    "example": "submit",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 26,
    "sourcePdfPage": 30,
    "image": "/word-element-mnemonics/latin_26_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 4
  },
  {
    "id": "latin_26_05",
    "family": "Latin",
    "elements": [
      "-pel-"
    ],
    "related": [
      "puls(e)"
    ],
    "meaning": "drive, push",
    "example": "expel",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 26,
    "sourcePdfPage": 30,
    "image": "/word-element-mnemonics/latin_26_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 5
  },
  {
    "id": "latin_26_06",
    "family": "Latin",
    "elements": [
      "-pend-"
    ],
    "related": [
      "pens(e)"
    ],
    "meaning": "hang, weigh",
    "example": "suspend",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 26,
    "sourcePdfPage": 30,
    "image": "/word-element-mnemonics/latin_26_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 6
  },
  {
    "id": "latin_27_01",
    "family": "Latin",
    "elements": [
      "-press-"
    ],
    "related": [],
    "meaning": "press, push against",
    "example": "compress",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 27,
    "sourcePdfPage": 31,
    "image": "/word-element-mnemonics/latin_27_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 7
  },
  {
    "id": "latin_27_02",
    "family": "Latin",
    "elements": [
      "-rupt-"
    ],
    "related": [],
    "meaning": "break",
    "example": "disrupt",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 27,
    "sourcePdfPage": 31,
    "image": "/word-element-mnemonics/latin_27_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 8
  },
  {
    "id": "latin_27_03",
    "family": "Latin",
    "elements": [
      "-sent-"
    ],
    "related": [
      "sens(e)"
    ],
    "meaning": "feel, perceive",
    "example": "absent",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 27,
    "sourcePdfPage": 31,
    "image": "/word-element-mnemonics/latin_27_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 9
  },
  {
    "id": "latin_27_04",
    "family": "Latin",
    "elements": [
      "-sist-"
    ],
    "related": [
      "sta",
      "stat(e)",
      "stit"
    ],
    "meaning": "place, stand",
    "example": "insist",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 27,
    "sourcePdfPage": 31,
    "image": "/word-element-mnemonics/latin_27_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 10
  },
  {
    "id": "latin_27_05",
    "family": "Latin",
    "elements": [
      "-stant-"
    ],
    "related": [],
    "meaning": "standing",
    "example": "constant",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 27,
    "sourcePdfPage": 31,
    "image": "/word-element-mnemonics/latin_27_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 11
  },
  {
    "id": "latin_27_06",
    "family": "Latin",
    "elements": [
      "-sult-"
    ],
    "related": [
      "salt"
    ],
    "meaning": "leap, assault",
    "example": "insult",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 27,
    "sourcePdfPage": 31,
    "image": "/word-element-mnemonics/latin_27_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 12
  },
  {
    "id": "latin_28_01",
    "family": "Latin",
    "elements": [
      "-tend-",
      "-tent-"
    ],
    "related": [
      "tens(e)"
    ],
    "meaning": "stretch, reach",
    "example": "extend",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 28,
    "sourcePdfPage": 32,
    "image": "/word-element-mnemonics/latin_28_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [
      "MULTI_ELEMENT_SINGLE_MNEMONIC_ROW"
    ],
    "order": 13
  },
  {
    "id": "latin_28_02",
    "family": "Latin",
    "elements": [
      "-vent-"
    ],
    "related": [
      "ven(e)",
      "veni"
    ],
    "meaning": "come",
    "example": "invent",
    "firstTaught": "2.4",
    "notebookSubstep": "2.4",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 28,
    "sourcePdfPage": 32,
    "image": "/word-element-mnemonics/latin_28_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 14
  },
  {
    "id": "latin_29_01",
    "family": "Latin",
    "elements": [
      "-dict-"
    ],
    "related": [
      "dic"
    ],
    "meaning": "say, tell",
    "example": "predict",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 29,
    "sourcePdfPage": 33,
    "image": "/word-element-mnemonics/latin_29_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 15
  },
  {
    "id": "latin_29_02",
    "family": "Latin",
    "elements": [
      "-duct-"
    ],
    "related": [
      "duc",
      "duce"
    ],
    "meaning": "lead",
    "example": "conduct",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 29,
    "sourcePdfPage": 33,
    "image": "/word-element-mnemonics/latin_29_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 16
  },
  {
    "id": "latin_29_03",
    "family": "Latin",
    "elements": [
      "-fect-"
    ],
    "related": [
      "fac",
      "fact",
      "fic"
    ],
    "meaning": "make, do",
    "example": "infect",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 29,
    "sourcePdfPage": 33,
    "image": "/word-element-mnemonics/latin_29_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 17
  },
  {
    "id": "latin_29_04",
    "family": "Latin",
    "elements": [
      "-flect-"
    ],
    "related": [
      "flex"
    ],
    "meaning": "bend, curve",
    "example": "reflect",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 29,
    "sourcePdfPage": 33,
    "image": "/word-element-mnemonics/latin_29_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 18
  },
  {
    "id": "latin_29_05",
    "family": "Latin",
    "elements": [
      "-flict-"
    ],
    "related": [
      "flig"
    ],
    "meaning": "strike to the ground",
    "example": "conflict",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 29,
    "sourcePdfPage": 33,
    "image": "/word-element-mnemonics/latin_29_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 19
  },
  {
    "id": "latin_29_06",
    "family": "Latin",
    "elements": [
      "-ject-"
    ],
    "related": [],
    "meaning": "throw",
    "example": "eject",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 29,
    "sourcePdfPage": 33,
    "image": "/word-element-mnemonics/latin_29_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 20
  },
  {
    "id": "latin_30_01",
    "family": "Latin",
    "elements": [
      "-lect-"
    ],
    "related": [
      "leg"
    ],
    "meaning": "gather, choose, read",
    "example": "select",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 30,
    "sourcePdfPage": 34,
    "image": "/word-element-mnemonics/latin_30_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 21
  },
  {
    "id": "latin_30_02",
    "family": "Latin",
    "elements": [
      "-pact-"
    ],
    "related": [],
    "meaning": "fastened, agreed",
    "example": "impact",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 30,
    "sourcePdfPage": 34,
    "image": "/word-element-mnemonics/latin_30_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 22
  },
  {
    "id": "latin_30_03",
    "family": "Latin",
    "elements": [
      "-rect-"
    ],
    "related": [],
    "meaning": "ruled, sight",
    "example": "direct",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 30,
    "sourcePdfPage": 34,
    "image": "/word-element-mnemonics/latin_30_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 23
  },
  {
    "id": "latin_30_04",
    "family": "Latin",
    "elements": [
      "-sect-"
    ],
    "related": [
      "sec"
    ],
    "meaning": "cut",
    "example": "insect",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 30,
    "sourcePdfPage": 34,
    "image": "/word-element-mnemonics/latin_30_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 24
  },
  {
    "id": "latin_30_05",
    "family": "Latin",
    "elements": [
      "-spect-"
    ],
    "related": [
      "spec"
    ],
    "meaning": "look, see, appear",
    "example": "inspect",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 30,
    "sourcePdfPage": 34,
    "image": "/word-element-mnemonics/latin_30_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 25
  },
  {
    "id": "latin_30_06",
    "family": "Latin",
    "elements": [
      "-struct-"
    ],
    "related": [
      "stru"
    ],
    "meaning": "build",
    "example": "construct",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 30,
    "sourcePdfPage": 34,
    "image": "/word-element-mnemonics/latin_30_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 26
  },
  {
    "id": "latin_31_01",
    "family": "Latin",
    "elements": [
      "-tact-"
    ],
    "related": [],
    "meaning": "touch",
    "example": "contact",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 31,
    "sourcePdfPage": 35,
    "image": "/word-element-mnemonics/latin_31_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 27
  },
  {
    "id": "latin_31_02",
    "family": "Latin",
    "elements": [
      "-tract-"
    ],
    "related": [],
    "meaning": "draw",
    "example": "contract",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 31,
    "sourcePdfPage": 35,
    "image": "/word-element-mnemonics/latin_31_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 28
  },
  {
    "id": "latin_31_03",
    "family": "Latin",
    "elements": [
      "-vict-"
    ],
    "related": [
      "vinc(e)"
    ],
    "meaning": "conquer",
    "example": "evict",
    "firstTaught": "2.5",
    "notebookSubstep": "2.5",
    "notebookCategory": "Latin Bases (with ct blend) Which Can Occur in Closed Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 31,
    "sourcePdfPage": 35,
    "image": "/word-element-mnemonics/latin_31_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 29
  },
  {
    "id": "latin_32_01",
    "family": "Latin",
    "elements": [
      "-clude-"
    ],
    "related": [
      "clud",
      "clus (cluse)",
      "close (close)"
    ],
    "meaning": "close",
    "example": "conclude",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 32,
    "sourcePdfPage": 36,
    "image": "/word-element-mnemonics/latin_32_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 30
  },
  {
    "id": "latin_32_02",
    "family": "Latin",
    "elements": [
      "-fuse-"
    ],
    "related": [
      "fus"
    ],
    "meaning": "pour",
    "example": "infuse",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 32,
    "sourcePdfPage": 36,
    "image": "/word-element-mnemonics/latin_32_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 31
  },
  {
    "id": "latin_32_03",
    "family": "Latin",
    "elements": [
      "-pose-"
    ],
    "related": [
      "pos",
      "pon"
    ],
    "meaning": "put, set",
    "example": "compose",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 32,
    "sourcePdfPage": 36,
    "image": "/word-element-mnemonics/latin_32_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 32
  },
  {
    "id": "latin_32_04",
    "family": "Latin",
    "elements": [
      "-pute-"
    ],
    "related": [
      "put"
    ],
    "meaning": "think, reckon",
    "example": "compute",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 32,
    "sourcePdfPage": 36,
    "image": "/word-element-mnemonics/latin_32_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 33
  },
  {
    "id": "latin_32_05",
    "family": "Latin",
    "elements": [
      "-quire-"
    ],
    "related": [
      "ques",
      "quer"
    ],
    "meaning": "ask, seek",
    "example": "inquire",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 32,
    "sourcePdfPage": 36,
    "image": "/word-element-mnemonics/latin_32_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 34
  },
  {
    "id": "latin_32_06",
    "family": "Latin",
    "elements": [
      "-scribe-"
    ],
    "related": [
      "scrib",
      "script"
    ],
    "meaning": "write",
    "example": "inscribe",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 32,
    "sourcePdfPage": 36,
    "image": "/word-element-mnemonics/latin_32_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 35
  },
  {
    "id": "latin_33_01",
    "family": "Latin",
    "elements": [
      "-spire-"
    ],
    "related": [
      "spir"
    ],
    "meaning": "breath of life, spirit",
    "example": "inspire",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 33,
    "sourcePdfPage": 37,
    "image": "/word-element-mnemonics/latin_33_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 36
  },
  {
    "id": "latin_33_02",
    "family": "Latin",
    "elements": [
      "-sume-"
    ],
    "related": [
      "sum",
      "sumpt"
    ],
    "meaning": "take",
    "example": "consume",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 33,
    "sourcePdfPage": 37,
    "image": "/word-element-mnemonics/latin_33_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 37
  },
  {
    "id": "latin_33_03",
    "family": "Latin",
    "elements": [
      "-vise-"
    ],
    "related": [
      "vis",
      "vid(e)"
    ],
    "meaning": "see",
    "example": "advise",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 33,
    "sourcePdfPage": 37,
    "image": "/word-element-mnemonics/latin_33_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 38
  },
  {
    "id": "latin_33_04",
    "family": "Latin",
    "elements": [
      "-voke-"
    ],
    "related": [
      "voc(e)"
    ],
    "meaning": "call, voice",
    "example": "invoke",
    "firstTaught": "4.1",
    "notebookSubstep": "4.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "1–6",
    "sourcePage": 33,
    "sourcePdfPage": 37,
    "image": "/word-element-mnemonics/latin_33_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 39
  },
  {
    "id": "latin_41_01",
    "family": "Latin",
    "elements": [
      "-cept-"
    ],
    "related": [
      "cap",
      "capt",
      "ceive"
    ],
    "meaning": "take, seize, hold",
    "example": "accept",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 41,
    "sourcePdfPage": 45,
    "image": "/word-element-mnemonics/latin_41_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 40
  },
  {
    "id": "latin_41_02",
    "family": "Latin",
    "elements": [
      "-cess-"
    ],
    "related": [],
    "meaning": "go, yield",
    "example": "recess",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 41,
    "sourcePdfPage": 45,
    "image": "/word-element-mnemonics/latin_41_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 41
  },
  {
    "id": "latin_41_03",
    "family": "Latin",
    "elements": [
      "-scend-"
    ],
    "related": [],
    "meaning": "climb",
    "example": "ascend",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 41,
    "sourcePdfPage": 45,
    "image": "/word-element-mnemonics/latin_41_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 42
  },
  {
    "id": "latin_41_04",
    "family": "Latin",
    "elements": [
      "-sess-"
    ],
    "related": [],
    "meaning": "to sit",
    "example": "obsess",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 41,
    "sourcePdfPage": 45,
    "image": "/word-element-mnemonics/latin_41_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 43
  },
  {
    "id": "latin_43_01",
    "family": "Latin",
    "elements": [
      "-cede-"
    ],
    "related": [
      "ced",
      "cess",
      "ceed"
    ],
    "meaning": "go, yield",
    "example": "recede",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 43,
    "sourcePdfPage": 47,
    "image": "/word-element-mnemonics/latin_43_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 44
  },
  {
    "id": "latin_43_02",
    "family": "Latin",
    "elements": [
      "-cide"
    ],
    "related": [
      "cise",
      "cis"
    ],
    "meaning": "cut, kill, slay",
    "example": "decide",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 43,
    "sourcePdfPage": 47,
    "image": "/word-element-mnemonics/latin_43_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 45
  },
  {
    "id": "latin_43_03",
    "family": "Latin",
    "elements": [
      "-cise-"
    ],
    "related": [
      "cide",
      "cis"
    ],
    "meaning": "cut, kill, slay",
    "example": "concise",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 43,
    "sourcePdfPage": 47,
    "image": "/word-element-mnemonics/latin_43_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 46
  },
  {
    "id": "latin_43_04",
    "family": "Latin",
    "elements": [
      "-cite-"
    ],
    "related": [
      "cit"
    ],
    "meaning": "call, arouse",
    "example": "excite",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 43,
    "sourcePdfPage": 47,
    "image": "/word-element-mnemonics/latin_43_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 47
  },
  {
    "id": "latin_43_05",
    "family": "Latin",
    "elements": [
      "-duce-"
    ],
    "related": [
      "duct"
    ],
    "meaning": "lead, bring",
    "example": "reduce",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 43,
    "sourcePdfPage": 47,
    "image": "/word-element-mnemonics/latin_43_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 48
  },
  {
    "id": "latin_43_06",
    "family": "Latin",
    "elements": [
      "-side-"
    ],
    "related": [
      "sed(e)",
      "sess"
    ],
    "meaning": "to sit",
    "example": "preside",
    "firstTaught": "7.1",
    "notebookSubstep": "7.1",
    "notebookCategory": "Latin Bases Which Can Occur in Vowel-Consonant-e Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 43,
    "sourcePdfPage": 47,
    "image": "/word-element-mnemonics/latin_43_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 49
  },
  {
    "id": "greek_47_01",
    "family": "Greek",
    "elements": [
      "-astro-"
    ],
    "related": [
      "aster"
    ],
    "meaning": "star, constellation",
    "example": "astrology",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 47,
    "sourcePdfPage": 51,
    "image": "/word-element-mnemonics/greek_47_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 50
  },
  {
    "id": "greek_47_02",
    "family": "Greek",
    "elements": [
      "-gram-"
    ],
    "related": [
      "gramm"
    ],
    "meaning": "written characters, letters",
    "example": "phonogram",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 47,
    "sourcePdfPage": 51,
    "image": "/word-element-mnemonics/greek_47_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 51
  },
  {
    "id": "greek_47_03",
    "family": "Greek",
    "elements": [
      "-graph-"
    ],
    "related": [],
    "meaning": "drawn or written",
    "example": "photograph",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 47,
    "sourcePdfPage": 51,
    "image": "/word-element-mnemonics/greek_47_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 52
  },
  {
    "id": "greek_47_04",
    "family": "Greek",
    "elements": [
      "-logy"
    ],
    "related": [
      "log"
    ],
    "meaning": "study of",
    "example": "astrology",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 47,
    "sourcePdfPage": 51,
    "image": "/word-element-mnemonics/greek_47_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 53
  },
  {
    "id": "greek_47_05",
    "family": "Greek",
    "elements": [
      "-micro-"
    ],
    "related": [],
    "meaning": "small",
    "example": "microscope",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 47,
    "sourcePdfPage": 51,
    "image": "/word-element-mnemonics/greek_47_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 54
  },
  {
    "id": "greek_47_06",
    "family": "Greek",
    "elements": [
      "mono-"
    ],
    "related": [
      "mon"
    ],
    "meaning": "one",
    "example": "monogram",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 47,
    "sourcePdfPage": 51,
    "image": "/word-element-mnemonics/greek_47_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 55
  },
  {
    "id": "greek_48_01",
    "family": "Greek",
    "elements": [
      "-path-"
    ],
    "related": [],
    "meaning": "feeling, suffering, disease",
    "example": "telepath",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 48,
    "sourcePdfPage": 52,
    "image": "/word-element-mnemonics/greek_48_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 56
  },
  {
    "id": "greek_48_02",
    "family": "Greek",
    "elements": [
      "-phone"
    ],
    "related": [],
    "meaning": "sound",
    "example": "telephone",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 48,
    "sourcePdfPage": 52,
    "image": "/word-element-mnemonics/greek_48_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 57
  },
  {
    "id": "greek_48_03",
    "family": "Greek",
    "elements": [
      "photo-"
    ],
    "related": [
      "phos",
      "phot"
    ],
    "meaning": "light",
    "example": "photograph",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 48,
    "sourcePdfPage": 52,
    "image": "/word-element-mnemonics/greek_48_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 58
  },
  {
    "id": "greek_48_04",
    "family": "Greek",
    "elements": [
      "-scope"
    ],
    "related": [
      "scop"
    ],
    "meaning": "instrument for viewing",
    "example": "microscope",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 48,
    "sourcePdfPage": 52,
    "image": "/word-element-mnemonics/greek_48_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 59
  },
  {
    "id": "greek_48_05",
    "family": "Greek",
    "elements": [
      "-sphere-"
    ],
    "related": [
      "spher"
    ],
    "meaning": "terrestrial globe or ball",
    "example": "photosphere",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 48,
    "sourcePdfPage": 52,
    "image": "/word-element-mnemonics/greek_48_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 60
  },
  {
    "id": "greek_48_06",
    "family": "Greek",
    "elements": [
      "tele-"
    ],
    "related": [],
    "meaning": "afar, distant",
    "example": "telephone",
    "firstTaught": "7.3",
    "notebookSubstep": "7.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 48,
    "sourcePdfPage": 52,
    "image": "/word-element-mnemonics/greek_48_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 61
  },
  {
    "id": "latin_44_01",
    "family": "Latin",
    "elements": [
      "-fer-"
    ],
    "related": [],
    "meaning": "to carry, bring",
    "example": "prefer",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 44,
    "sourcePdfPage": 48,
    "image": "/word-element-mnemonics/latin_44_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 62
  },
  {
    "id": "latin_44_02",
    "family": "Latin",
    "elements": [
      "-firm-"
    ],
    "related": [],
    "meaning": "strong, steady",
    "example": "confirm",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 44,
    "sourcePdfPage": 48,
    "image": "/word-element-mnemonics/latin_44_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 63
  },
  {
    "id": "latin_44_03",
    "family": "Latin",
    "elements": [
      "-form-"
    ],
    "related": [],
    "meaning": "to form, shape",
    "example": "inform",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 44,
    "sourcePdfPage": 48,
    "image": "/word-element-mnemonics/latin_44_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 64
  },
  {
    "id": "latin_44_04",
    "family": "Latin",
    "elements": [
      "-part-"
    ],
    "related": [],
    "meaning": "part, divide",
    "example": "compartment",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 44,
    "sourcePdfPage": 48,
    "image": "/word-element-mnemonics/latin_44_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 65
  },
  {
    "id": "latin_44_05",
    "family": "Latin",
    "elements": [
      "-port-"
    ],
    "related": [],
    "meaning": "to carry",
    "example": "export",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 44,
    "sourcePdfPage": 48,
    "image": "/word-element-mnemonics/latin_44_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 66
  },
  {
    "id": "latin_44_06",
    "family": "Latin",
    "elements": [
      "-serve"
    ],
    "related": [],
    "meaning": "to watch, protect, serve",
    "example": "observe",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 44,
    "sourcePdfPage": 48,
    "image": "/word-element-mnemonics/latin_44_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 67
  },
  {
    "id": "latin_45_01",
    "family": "Latin",
    "elements": [
      "-vert-"
    ],
    "related": [
      "vert"
    ],
    "meaning": "to turn",
    "example": "convert",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 45,
    "sourcePdfPage": 49,
    "image": "/word-element-mnemonics/latin_45_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 68
  },
  {
    "id": "latin_45_02",
    "family": "Latin",
    "elements": [
      "-vers(e)-"
    ],
    "related": [
      "vers(e)"
    ],
    "meaning": "to turn",
    "example": "reverse",
    "firstTaught": "8.1",
    "notebookSubstep": "8.1",
    "notebookCategory": "Latin Bases Which Can Occur in R-controlled Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 45,
    "sourcePdfPage": 49,
    "image": "/word-element-mnemonics/latin_45_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 69
  },
  {
    "id": "greek_49_01",
    "family": "Greek",
    "elements": [
      "-meter-",
      "-metry"
    ],
    "related": [],
    "meaning": "to measure",
    "example": "thermometer",
    "firstTaught": "8.3",
    "notebookSubstep": "8.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 49,
    "sourcePdfPage": 53,
    "image": "/word-element-mnemonics/greek_49_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [
      "MULTI_ELEMENT_SINGLE_MNEMONIC_ROW"
    ],
    "order": 70
  },
  {
    "id": "greek_49_02",
    "family": "Greek",
    "elements": [
      "-therm-"
    ],
    "related": [],
    "meaning": "heat",
    "example": "thermometer",
    "firstTaught": "8.3",
    "notebookSubstep": "8.3",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 49,
    "sourcePdfPage": 53,
    "image": "/word-element-mnemonics/greek_49_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 71
  },
  {
    "id": "latin_46_01",
    "family": "Latin",
    "elements": [
      "-tain-"
    ],
    "related": [
      "ten",
      "tin"
    ],
    "meaning": "to hold",
    "example": "container",
    "firstTaught": "9.1",
    "notebookSubstep": "9.1",
    "notebookCategory": "Latin Bases Which Can Occur in Double Vowel \"D\" Syllable",
    "sourceVolume": "7–12",
    "sourcePage": 46,
    "sourcePdfPage": 50,
    "image": "/word-element-mnemonics/latin_46_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 72
  },
  {
    "id": "latin_46_02",
    "family": "Latin",
    "elements": [
      "-ceed-"
    ],
    "related": [
      "cede"
    ],
    "meaning": "to go, yield",
    "example": "proceed",
    "firstTaught": "9.2",
    "notebookSubstep": "9.2",
    "notebookCategory": "Latin Bases Which Can Occur in Double Vowel \"D\" Syllable",
    "sourceVolume": "7–12",
    "sourcePage": 46,
    "sourcePdfPage": 50,
    "image": "/word-element-mnemonics/latin_46_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 73
  },
  {
    "id": "latin_46_03",
    "family": "Latin",
    "elements": [
      "-crease-"
    ],
    "related": [
      "cresc",
      "cret(e)"
    ],
    "meaning": "to grow",
    "example": "increase",
    "firstTaught": "9.6",
    "notebookSubstep": "9.6",
    "notebookCategory": "Latin Bases Which Can Occur in Double Vowel \"D\" Syllable",
    "sourceVolume": "7–12",
    "sourcePage": 46,
    "sourcePdfPage": 50,
    "image": "/word-element-mnemonics/latin_46_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 74
  },
  {
    "id": "greek_49_03",
    "family": "Greek",
    "elements": [
      "hydro-"
    ],
    "related": [
      "hydr"
    ],
    "meaning": "water",
    "example": "hydrosphere",
    "firstTaught": "11.1",
    "notebookSubstep": "11.1",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 49,
    "sourcePdfPage": 53,
    "image": "/word-element-mnemonics/greek_49_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 75
  },
  {
    "id": "latin_46_04",
    "family": "Latin",
    "elements": [
      "-ceive-"
    ],
    "related": [
      "cept"
    ],
    "meaning": "take, seize, hold",
    "example": "receive",
    "firstTaught": "11.4",
    "notebookSubstep": "11.4",
    "notebookCategory": "Latin Bases Which Can Occur in Double Vowel \"D\" Syllable",
    "sourceVolume": "7–12",
    "sourcePage": 46,
    "sourcePdfPage": 50,
    "image": "/word-element-mnemonics/latin_46_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 76
  },
  {
    "id": "greek_49_04",
    "family": "Greek",
    "elements": [
      "bio-"
    ],
    "related": [],
    "meaning": "life",
    "example": "biology",
    "firstTaught": "11.5",
    "notebookSubstep": "11.5",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 49,
    "sourcePdfPage": 53,
    "image": "/word-element-mnemonics/greek_49_04.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 77
  },
  {
    "id": "greek_49_05",
    "family": "Greek",
    "elements": [
      "-mania"
    ],
    "related": [],
    "meaning": "excessive, excitement",
    "example": "egomania",
    "firstTaught": "11.5",
    "notebookSubstep": "11.5",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 49,
    "sourcePdfPage": 53,
    "image": "/word-element-mnemonics/greek_49_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 78
  },
  {
    "id": "greek_49_06",
    "family": "Greek",
    "elements": [
      "-phobia"
    ],
    "related": [],
    "meaning": "fear",
    "example": "hydrophobia",
    "firstTaught": "11.5",
    "notebookSubstep": "11.5",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 49,
    "sourcePdfPage": 53,
    "image": "/word-element-mnemonics/greek_49_06.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 79
  },
  {
    "id": "greek_50_01",
    "family": "Greek",
    "elements": [
      "ge-"
    ],
    "related": [],
    "meaning": "earth",
    "example": "geology",
    "firstTaught": "12.1",
    "notebookSubstep": "12.1",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 50,
    "sourcePdfPage": 54,
    "image": "/word-element-mnemonics/greek_50_01.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 80
  },
  {
    "id": "latin_41_05",
    "family": "Latin",
    "elements": [
      "-sign-"
    ],
    "related": [],
    "meaning": "sign, to mark",
    "example": "design",
    "firstTaught": "12.2",
    "notebookSubstep": "12.2",
    "notebookCategory": "Latin Bases Which Can Occur in Closed Syllables",
    "sourceVolume": "7–12",
    "sourcePage": 41,
    "sourcePdfPage": 45,
    "image": "/word-element-mnemonics/latin_41_05.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Student Notebook row + existing cleaned Latin inventory; no illustrated-row placement conflict found",
    "auditFlags": [],
    "order": 81
  },
  {
    "id": "greek_50_02",
    "family": "Greek",
    "elements": [
      "chron-"
    ],
    "related": [
      "chrono"
    ],
    "meaning": "time",
    "example": "chronology",
    "firstTaught": "12.4",
    "notebookSubstep": "12.4",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 50,
    "sourcePdfPage": 54,
    "image": "/word-element-mnemonics/greek_50_02.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 82
  },
  {
    "id": "greek_50_03",
    "family": "Greek",
    "elements": [
      "psych-"
    ],
    "related": [],
    "meaning": "spirit, soul",
    "example": "psychology",
    "firstTaught": "12.4",
    "notebookSubstep": "12.4",
    "notebookCategory": "Common Greek Bases - Combining Forms",
    "sourceVolume": "7–12",
    "sourcePage": 50,
    "sourcePdfPage": 54,
    "image": "/word-element-mnemonics/greek_50_03.png",
    "sourceStatus": "Wilson Student Notebook Answer Key",
    "sourceBasis": "Step Instruction (Release 1.0.1 searchable companion) + Student Notebook",
    "auditFlags": [],
    "order": 83
  }
];
