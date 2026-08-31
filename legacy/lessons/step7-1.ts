import { Lesson, WordCard, AffixEntry, LessonPart } from '../types';
import { generateId } from '../utils';

const wordListStrings = [
  "page", "trace", "price", "cement", "huge", "acid", "rice", "principle", 
  "intelligent", "civil", "citizen", "device", "budget", "twice", "stage", 
  "race", "grace", "necessity", "vice", "fancy", "agency", "ice", "tendency", 
  "central", "cent", "pace", "fireplace", "frequency", "face", "legend", 
  "replace", "suggests", "recycle", "restage", "disengage", "priceless", 
  "disgrace", "placement", "unintelligent", "mid-stage", "nonspecific", 
  "concepts", "nicely", "reface", "displace"
];

const wordCards: WordCard[] = wordListStrings.map(text => ({
  id: generateId(),
  text,
  type: 'regular'
}));

const latinBases: AffixEntry[] = [
  { id: generateId(), text: 'cede', type: 'root', examples: 'recede, precede' },
  { id: generateId(), text: 'cess', type: 'root', examples: 'excess, process' },
  { id: generateId(), text: 'cept', type: 'root', examples: 'concept, accept' },
  { id: generateId(), text: 'cide', type: 'root', examples: 'decide, suicide' },
  { id: generateId(), text: 'cise', type: 'root', examples: 'precise, exercise' },
  { id: generateId(), text: 'cite', type: 'root', examples: 'excite, recite' },
  { id: generateId(), text: 'duce', type: 'root', examples: 'produce, reduce' },
  { id: generateId(), text: 'scend', type: 'root', examples: 'ascend, descend' },
  { id: generateId(), text: 'side', type: 'root', examples: 'reside, preside' },
  { id: generateId(), text: 'sess', type: 'root', examples: 'session, assess' },
];

export const lesson71: Lesson = {
  id: 'wrs-7-1-master',
  title: "Substep 7.1: Soft C & G / Latin Bases",
  step: "7",
  substep: "1",
  conceptNotes: "c makes the /s/ sound and g makes the /j/ sound when followed by e, i, or y. Latin bases: -cede-/-cess- (go), -cept- (take), -cide-/-cise- (cut), -cite- (call), -duce- (lead), -scend- (climb), -side-/-sess- (sit).",
  conceptNotes7: "Notebook: Enter e, i, y next to c/g. Mark 'cent' and 'stage'. Add Latin bases to Word Elements section.",
  cipherWords: ["decent", "giant", "suggest", "place", "stingy", "engage", "fancy"],
  cipherDistractors: ["desent", "jiant", "sudjest", "plase", "stinjy", "engaje", "fantsy"],
  hfwList: ["necessary", "excellent", "police", "special", "especially", "false"],
  quickDrill: ["c", "g", "s", "j", "k", "ck", "e", "i", "y"],
  quickDrillReverse: ["s", "j", "k"],
  wordCards,
  wordListReading: wordListStrings.slice(0, 15),
  wordListReadingAuto: true,
  sentences: [
    "The placement of the sofa made the space look especially small.",
    "Everything fit nicely in the gigantic ice bucket.",
    "My father had to retrace his steps so that he could find his jacket.",
    "Many citizens from this district plan to vote today.",
    "It is necessary to replace the missing baseball before the big game.",
    "We will have to replace everything in the house except the rugs.",
    "Is it absolutely necessary to polish this priceless gem?",
    "It is false to state that it is difficult to recycle plastic bottles.",
    "Be careful when you uncage that wild animal!",
    "Is the special price for this van acceptable to you?"
  ],
  dictation: {
    sounds: ["/s/ (s, c)", "/j/ (j, g)", "/k/ (c, k, ck)", "/ă/", "/ĭng/"],
    realWords: ["cinch", "gentle", "produce", "recycle", "placement"],
    wordElements: ["-cept-", "-duce-", "-cide-", "re-", "-ment"],
    nonsenseWords: [],
    phrases: [],
    sentences: [
      "Many citizens from this district plan to vote today.",
      "Everything fit nicely in the gigantic ice bucket.",
      "It is necessary to replace the missing baseball before the big game."
    ]
  },
  affixPractice: latinBases,
  passage: `Cindy the Excellent
Another student presented a legend about a princess called Cindy the Excellent. It had been predicted that someday this graceful baby would be able to solve the most difficult riddles and provide necessary answers to the most demanding problems.

Cindy spent her days as a child in a stone castle on an especially large hill. When Cindy became an adult princess, people traveled for days just to ask her for advice. Will I have success on my new cycle, Cindy? What is the best price for this gem, Cindy? Except, this princess could never decide how to answer any of these puzzles. Time after time, she responded, "My, my. I do not know!" Everyone was a fan of this tale about an excellent princess who was unable to solve a single trouble. Do you have your own tale to tell?`,
  slides: [
    {
      id: generateId(),
      type: 'template',
      title: 'Soft C and G Rule',
      content: 'c -> /s/ before e, i, y\ng -> /j/ before e, i, y',
      elements: [
        { id: generateId(), type: 'text', content: 'Soft C & G', y: 10 },
        { id: generateId(), type: 'word', content: 'cent', x: 20, y: 40 },
        { id: generateId(), type: 'word', content: 'city', x: 40, y: 40 },
        { id: generateId(), type: 'word', content: 'cycle', x: 60, y: 40 },
        { id: generateId(), type: 'word', content: 'stage', x: 20, y: 60 },
        { id: generateId(), type: 'word', content: 'magic', x: 40, y: 60 },
        { id: generateId(), type: 'word', content: 'gym', x: 60, y: 60 },
      ]
    }
  ],
  lastUpdated: new Date().toISOString()
};
