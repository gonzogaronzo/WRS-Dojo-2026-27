import { Lesson, WordCard, AffixEntry } from '../types';
import { generateId } from '../utils';

const wordListStrings = [
  "catch", "latch", "stretch", "switch", "kitchen", "watch",
  "phone", "graph", "phase", "trophy", "dolphin", "physical", "elephant",
  "microscope", "telescope", "telegraph", "autograph", "microphone",
  "atmo-sphere", "hemi-sphere", "bio-gram", "photo-graph",
  "latched", "unlatched", "stitching", "unstitching", "graphing",
  "telecast", "science", "scientist", "scientific", "knowledge", "college"
];

const wordCards: WordCard[] = wordListStrings.map(text => ({
  id: generateId(),
  text,
  type: 'regular'
}));

const greekElements: AffixEntry[] = [
  { id: generateId(), text: 'astro-', type: 'prefix', examples: 'astronaut, astronomy' },
  { id: generateId(), text: 'gram-', type: 'root', examples: 'diagram, grammar' },
  { id: generateId(), text: 'graph-', type: 'root', examples: 'autograph, graphic' },
  { id: generateId(), text: 'logy', type: 'suffix', examples: 'biology, geology' },
  { id: generateId(), text: 'ology', type: 'suffix', examples: 'sociology, archaeology' },
  { id: generateId(), text: 'micro-', type: 'prefix', examples: 'microscope, microbe' },
  { id: generateId(), text: 'mono-', type: 'prefix', examples: 'monologue, monarch' },
  { id: generateId(), text: 'path-', type: 'root', examples: 'sympathy, pathetic' },
  { id: generateId(), text: 'phone-', type: 'root', examples: 'telephone, phonics' },
  { id: generateId(), text: 'phono-', type: 'root', examples: 'phonogram, phonology' },
  { id: generateId(), text: 'photo-', type: 'prefix', examples: 'photograph, photon' },
  { id: generateId(), text: 'scope', type: 'suffix', examples: 'telescope, periscope' },
  { id: generateId(), text: 'sphere', type: 'suffix', examples: 'atmosphere, biosphere' },
  { id: generateId(), text: 'tele-', type: 'prefix', examples: 'television, telepathy' },
];

export const lesson73: Lesson = {
  id: 'wrs-7-3-master',
  title: "Substep 7.3: Digraph ph / Trigraph tch / Greek Elements",
  step: "7",
  substep: "3",
  conceptNotes: "Digraph ph says /f/ (phone). Trigraph tch says /ch/ directly after a short vowel (catch). Greek combining forms (micro-, -scope, astro-) are common in scientific and technical words.",
  conceptNotes7: "ph - phone - /f/. tch - catch - /ch/. Explore Greek elements: astro, micro, tele, scope, graph. Notice dashes for placement.",
  cipherWords: ["phone", "catch", "graph", "switch", "dolphin", "stretch", "microscope"],
  cipherDistractors: ["fone", "cach", "graf", "swich", "dolfin", "strech", "mickroscope"],
  hfwList: ["knowledge", "college", "watch", "physical", "science", "scientist", "scientific"],
  quickDrill: ["ph", "tch", "f", "ch", "sh", "th", "wh", "ck", "dge"],
  quickDrillReverse: ["f", "ch", "j", "s", "k"],
  wordCards,
  wordListReading: wordListStrings.slice(0, 15),
  wordListReadingAuto: true,
  sentences: [
    "The elephant was in good physical shape.",
    "Philip lost his phone on the way to his college class.",
    "Benjamin switched the channel when the college basketball game was over.",
    "The scientist used a microscope to look at the tiny organism.",
    "We had to watch the scientist carefully as she worked on the project.",
    "The physical science teacher spoke about the atmosphere and biosphere.",
    "Did you watch that dolphin swim right by the ship?",
    "The scientist invented a new stretchable cloth.",
    "My mom bought Jake a new saxophone the other day.",
    "The telecast of the game was seen all over the hemisphere."
  ],
  dictation: {
    sounds: ["/f/ (f, ph)", "/ch/ (ch, tch)", "/j/ (j, g, dge)", "/s/ (s, c, ce)", "/k/ (c, k, ck, ch)"],
    realWords: ["physical", "catch", "switch", "microscope", "dolphin"],
    wordElements: ["micro-", "tele-", "-phone", "-graph", "-scope"],
    nonsenseWords: [],
    phrases: ["knowledge of college", "watch the scientist", "the physical science"],
    sentences: [
      "Did you watch that dolphin swim right by the ship?",
      "The scientist invented a new stretchable cloth.",
      "My mom bought Jake a new saxophone the other day."
    ]
  },
  affixPractice: greekElements,
  passage: `Alexander Graham Bell
However, one intelligent man in Boston wished for something greater. Alexander Graham Bell wanted to advance the telegraph.
His scientific work focused on developing a way to transmit more than one telegram at a time. He wanted to show that you could send notes and signals with different pitches.
Mr. Bell worked tirelessly. One day, by accident, his assistant sent a sound across a wire. This shocking moment in 1875 expanded Bell's work. By the next year, he had invented a way to talk to another person across a wire. The first telephone call made between Bell and his assistant would change everything!`,
  slides: [
    {
      id: generateId(),
      type: 'template',
      title: 'New Digraph & Trigraph',
      content: 'ph -> /f/ (phone)\ntch -> /ch/ (catch)',
      elements: [
        { id: generateId(), type: 'text', content: 'ph & tch', y: 10 },
        { id: generateId(), type: 'word', content: 'phone', x: 25, y: 40 },
        { id: generateId(), type: 'word', content: 'graph', x: 25, y: 60 },
        { id: generateId(), type: 'word', content: 'catch', x: 65, y: 40 },
        { id: generateId(), type: 'word', content: 'match', x: 65, y: 60 },
      ]
    },
    {
      id: generateId(),
      type: 'template',
      title: 'Greek Combining Forms',
      content: 'astro-, micro-, tele-\n-scope, -graph, -phone',
      elements: [
        { id: generateId(), type: 'text', content: 'Greek Elements', y: 10 },
        { id: generateId(), type: 'word', content: 'microscope', x: 30, y: 40 },
        { id: generateId(), type: 'word', content: 'telescope', x: 70, y: 40 },
        { id: generateId(), type: 'word', content: 'telephone', x: 30, y: 70 },
        { id: generateId(), type: 'word', content: 'telegraph', x: 70, y: 70 },
      ]
    }
  ],
  lastUpdated: new Date().toISOString()
};
