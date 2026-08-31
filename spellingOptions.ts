export interface SpellingOption {
  grapheme: string;
  introduced: string;
  keyword: string;
}

export const SPELLING_OPTIONS: Record<string, SpellingOption[]> = {
  "/ă/": [{ grapheme: "a", introduced: "1.1", keyword: "apple" }],
  "/b/": [{ grapheme: "b", introduced: "1.1", keyword: "bat" }],
  "/k/": [
    { grapheme: "c", introduced: "1.1", keyword: "cat" },
    { grapheme: "k", introduced: "1.1", keyword: "kite" },
    { grapheme: "ck", introduced: "1.2", keyword: "sock" },
    { grapheme: "ch", introduced: "12.4", keyword: "chorus" },
    { grapheme: "que", introduced: "12.4", keyword: "clique" }
  ],
  "/d/": [{ grapheme: "d", introduced: "1.1", keyword: "dog" }],
  "/f/": [
    { grapheme: "f", introduced: "1.1", keyword: "fun" },
    { grapheme: "ph", introduced: "7.3", keyword: "phone" }
  ],
  "/g/": [
    { grapheme: "g", introduced: "1.1", keyword: "game" },
    { grapheme: "gh", introduced: "12.2", keyword: "ghost" }
  ],
  "/h/": [{ grapheme: "h", introduced: "1.1", keyword: "hat" }],
  "/ĭ/": [
    { grapheme: "i", introduced: "1.1", keyword: "itch" },
    { grapheme: "y", introduced: "11.1", keyword: "gym" }
  ],
  "/j/": [
    { grapheme: "j", introduced: "1.1", keyword: "jug" },
    { grapheme: "g", introduced: "7.1", keyword: "stage" },
    { grapheme: "dge", introduced: "7.2", keyword: "fudge" }
  ],
  "/l/": [{ grapheme: "l", introduced: "1.1", keyword: "lamp" }],
  "/m/": [
    { grapheme: "m", introduced: "1.1", keyword: "man" },
    { grapheme: "mb", introduced: "12.2", keyword: "lamb" },
    { grapheme: "mn", introduced: "12.2", keyword: "column" }
  ],
  "/n/": [
    { grapheme: "n", introduced: "1.1", keyword: "nut" },
    { grapheme: "gn", introduced: "12.2", keyword: "gnat" },
    { grapheme: "kn", introduced: "12.2", keyword: "knife" }
  ],
  "/ŏ/": [{ grapheme: "o", introduced: "1.1", keyword: "octopus" }],
  "/p/": [{ grapheme: "p", introduced: "1.1", keyword: "pan" }],
  "/r/": [
    { grapheme: "r", introduced: "1.1", keyword: "rat" },
    { grapheme: "rh", introduced: "12.2", keyword: "rhyme" },
    { grapheme: "wr", introduced: "12.2", keyword: "wrist" }
  ],
  "/s/": [
    { grapheme: "s", introduced: "1.1", keyword: "snake" },
    { grapheme: "c", introduced: "7.1", keyword: "cent" }
  ],
  "/t/": [{ grapheme: "t", introduced: "1.1", keyword: "top" }],
  "/ĕ/": [
    { grapheme: "e", introduced: "1.2", keyword: "Ed" },
    { grapheme: "ea", introduced: "9.6", keyword: "bread" }
  ],
  "/ks/": [{ grapheme: "x", introduced: "1.2", keyword: "fox" }],
  "/kw/": [{ grapheme: "qu", introduced: "1.2", keyword: "queen" }],
  "/sh/": [{ grapheme: "sh", introduced: "1.2", keyword: "ship" }],
  "/th/": [{ grapheme: "th", introduced: "1.2", keyword: "thumb" }],
  "/ŭ/": [{ grapheme: "u", introduced: "1.2", keyword: "up" }],
  "/v/": [{ grapheme: "v", introduced: "1.2", keyword: "van" }],
  "/w/": [{ grapheme: "w", introduced: "1.2", keyword: "wind" }],
  "/wh/": [{ grapheme: "wh", introduced: "1.2", keyword: "whistle" }],
  "/y/": [
    { grapheme: "y", introduced: "1.2", keyword: "yellow" },
    { grapheme: "i", introduced: "11.5", keyword: "million" }
  ],
  "/z/": [
    { grapheme: "z", introduced: "1.2", keyword: "zebra" },
    { grapheme: "s", introduced: "1.3", keyword: "visit" }
  ],
  "/ch/": [
    { grapheme: "ch", introduced: "1.3", keyword: "chin" },
    { grapheme: "tch", introduced: "7.3", keyword: "catch" }
  ],
  "/ôl/": [{ grapheme: "all", introduced: "1.4", keyword: "ball" }],
  "/am/": [{ grapheme: "am", introduced: "1.5", keyword: "ham" }],
  "/an/": [{ grapheme: "an", introduced: "1.5", keyword: "fan" }],
  "/ang/": [{ grapheme: "ang", introduced: "2.1", keyword: "fang" }],
  "/ank/": [{ grapheme: "ank", introduced: "2.1", keyword: "bank" }],
  "/ing/": [{ grapheme: "ing", introduced: "2.1", keyword: "ring" }],
  "/ink/": [{ grapheme: "ink", introduced: "2.1", keyword: "pink" }],
  "/ong/": [{ grapheme: "ong", introduced: "2.1", keyword: "song" }],
  "/onk/": [{ grapheme: "onk", introduced: "2.1", keyword: "honk" }],
  "/ung/": [{ grapheme: "ung", introduced: "2.1", keyword: "lung" }],
  "/unk/": [{ grapheme: "unk", introduced: "2.1", keyword: "junk" }],
  "/īld/": [{ grapheme: "ild", introduced: "2.3", keyword: "wild" }],
  "/īnd/": [{ grapheme: "ind", introduced: "2.3", keyword: "find" }],
  "/ōld/": [{ grapheme: "old", introduced: "2.3", keyword: "cold" }],
  "/ōlt/": [{ grapheme: "olt", introduced: "2.3", keyword: "colt" }],
  "/ōst/": [{ grapheme: "ost", introduced: "2.3", keyword: "post" }],
  "/ā/": [
    { grapheme: "a", introduced: "3.1", keyword: "acorn" },
    { grapheme: "a-e", introduced: "4.1", keyword: "safe" },
    { grapheme: "ai", introduced: "9.1", keyword: "bait" },
    { grapheme: "ay", introduced: "9.1", keyword: "play" },
    { grapheme: "ea", introduced: "9.6", keyword: "steak" },
    { grapheme: "eigh", introduced: "11.3", keyword: "eight" },
    { grapheme: "ei", introduced: "11.4", keyword: "vein" }
  ],
  "/ē/": [
    { grapheme: "e", introduced: "3.1", keyword: "me" },
    { grapheme: "e-e", introduced: "4.1", keyword: "Pete" },
    { grapheme: "y", introduced: "5.3", keyword: "baby" },
    { grapheme: "ee", introduced: "9.2", keyword: "jeep" },
    { grapheme: "ey", introduced: "9.2", keyword: "valley" },
    { grapheme: "ea", introduced: "9.6", keyword: "eat" },
    { grapheme: "ei", introduced: "11.4", keyword: "ceiling" },
    { grapheme: "ie", introduced: "11.4", keyword: "piece" },
    { grapheme: "i", introduced: "11.5", keyword: "champion" }
  ],
  "/ī/": [
    { grapheme: "i", introduced: "3.1", keyword: "hi" },
    { grapheme: "i-e", introduced: "4.1", keyword: "pine" },
    { grapheme: "y", introduced: "5.1", keyword: "cry" },
    { grapheme: "y", introduced: "11.1", keyword: "type, reply" },
    { grapheme: "igh", introduced: "11.3", keyword: "light" }
  ],
  "/ō/": [
    { grapheme: "o", introduced: "3.1", keyword: "no" },
    { grapheme: "o-e", introduced: "4.1", keyword: "home" },
    { grapheme: "oa", introduced: "9.3", keyword: "boat" },
    { grapheme: "oe", introduced: "9.3", keyword: "toe" },
    { grapheme: "ow", introduced: "9.5", keyword: "snow" }
  ],
  "/ū/": [
    { grapheme: "u", introduced: "3.1", keyword: "pupil" },
    { grapheme: "u-e", introduced: "4.1", keyword: "mule" },
    { grapheme: "ue", introduced: "9.3", keyword: "rescue" },
    { grapheme: "eu", introduced: "9.7", keyword: "feud" },
    { grapheme: "ew", introduced: "9.7", keyword: "few" }
  ],
  "/ü/": [
    { grapheme: "u", introduced: "3.1", keyword: "flu" },
    { grapheme: "u-e", introduced: "4.1", keyword: "rule" },
    { grapheme: "ue", introduced: "9.3", keyword: "blue" },
    { grapheme: "oo", introduced: "9.5", keyword: "school" },
    { grapheme: "ou", introduced: "9.5", keyword: "soup" },
    { grapheme: "eu", introduced: "9.7", keyword: "deuce" },
    { grapheme: "ew", introduced: "9.7", keyword: "chew" },
    { grapheme: "ui", introduced: "9.7", keyword: "suit" }
  ],
  "/ĭv/": [{ grapheme: "ive", introduced: "4.4", keyword: "give" }],
  "/ə/": [
    { grapheme: "a", introduced: "5.5", keyword: "Alaska" },
    { grapheme: "i", introduced: "5.5", keyword: "animal" }
  ],
  "/shŭn/": [
    { grapheme: "tion", introduced: "7.4", keyword: "vacation" },
    { grapheme: "sion", introduced: "7.4", keyword: "mansion" }
  ],
  "/zhŭn/": [{ grapheme: "sion", introduced: "7.4", keyword: "television" }],
  "/ar/": [{ grapheme: "ar", introduced: "8.1", keyword: "car" }],
  "/ẽr/": [
    { grapheme: "er", introduced: "8.1", keyword: "her" },
    { grapheme: "ir", introduced: "8.1", keyword: "bird" },
    { grapheme: "ur", introduced: "8.1", keyword: "burn" },
    { grapheme: "ar", introduced: "8.5", keyword: "beggar, wizard" },
    { grapheme: "or", introduced: "8.5", keyword: "doctor" },
    { grapheme: "or", introduced: "12.3", keyword: "worm" }
  ],
  "/or/": [
    { grapheme: "or", introduced: "8.1", keyword: "horn" },
    { grapheme: "ar", introduced: "12.3", keyword: "warm" }
  ],
  "/ô/": [
    { grapheme: "au", introduced: "9.4", keyword: "August" },
    { grapheme: "aw", introduced: "9.4", keyword: "saw" },
    { grapheme: "a", introduced: "12.3", keyword: "squash, wash" }
  ],
  "/oi/": [
    { grapheme: "oi", introduced: "9.4", keyword: "coin" },
    { grapheme: "oy", introduced: "9.4", keyword: "boy" }
  ],
  "/oo/": [{ grapheme: "oo", introduced: "9.5", keyword: "book" }],
  "/ou/": [
    { grapheme: "ou", introduced: "9.5", keyword: "trout" },
    { grapheme: "ow", introduced: "9.5", keyword: "plow" }
  ],
  "/chü/": [{ grapheme: "tu", introduced: "12.5", keyword: "spatula" }],
  "/chẽr/": [{ grapheme: "ture", introduced: "12.5", keyword: "departure" }],
  "/shəl/": [
    { grapheme: "tial", introduced: "12.5", keyword: "partial" },
    { grapheme: "cial", introduced: "12.5", keyword: "special" }
  ],
  "/shən/": [{ grapheme: "cian", introduced: "12.5", keyword: "magician" }],
  "/shənt/": [
    { grapheme: "tient", introduced: "12.5", keyword: "patient" },
    { grapheme: "cient", introduced: "12.5", keyword: "ancient" }
  ],
  "/shəs/": [
    { grapheme: "tious", introduced: "12.5", keyword: "cautious" },
    { grapheme: "cious", introduced: "12.5", keyword: "precious" }
  ],
  "/shẽr/": [{ grapheme: "sure", introduced: "12.5", keyword: "pressure" }],
  "/zhẽr/": [{ grapheme: "sure", introduced: "12.5", keyword: "closure" }]
};
