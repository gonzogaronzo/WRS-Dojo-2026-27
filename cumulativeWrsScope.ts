import { WRS_PHONEME_MAP } from './wrsKnowledgeBase';

type ScopeItem = [string, string];

const HIGH_FREQUENCY_WORDS: ScopeItem[] = [["1.1","at"],["1.1","it"],["1.1","not"],["1.3","a"],["1.3","and"],["1.3","his"],["1.3","I"],["1.3","is"],["1.3","the"],["1.3","was"],["1.4","do"],["1.4","does"],["1.4","into"],["1.4","of"],["1.4","shall"],["1.4","to"],["1.4","you"],["1.4","your"],["1.5","are"],["1.5","as"],["1.5","be"],["1.5","for"],["1.5","has"],["1.5","he"],["1.5","me"],["1.5","or"],["1.5","she"],["1.5","want"],["1.5","we"],["1.6","both"],["1.6","from"],["1.6","have"],["1.6","one"],["1.6","they"],["2.1","asked"],["2.1","could"],["2.1","her"],["2.1","how"],["2.1","now"],["2.1","should"],["2.1","were"],["2.1","would"],["2.2","by"],["2.2","here"],["2.2","my"],["2.2","there"],["2.2","try"],["2.2","what"],["2.2","when"],["2.2","where"],["2.2","which"],["2.2","who"],["2.2","why"],["2.3","any"],["2.3","anyone"],["2.3","anything"],["2.3","anywhere"],["2.3","become"],["2.3","becomes"],["2.3","becoming"],["2.3","been"],["2.3","come"],["2.3","comes"],["2.3","coming"],["2.3","many"],["2.3","put"],["2.3","putting"],["2.3","some"],["2.4","about"],["2.4","front"],["2.4","only"],["2.4","out"],["2.4","said"],["2.4","their"],["2.5","also"],["2.5","each"],["2.5","every"],["2.5","everyone"],["2.5","everything"],["2.5","everywhere"],["2.5","go"],["2.5","no"],["2.5","so"],["2.5","too"],["2.5","two"],["2.5","very"],["2.5","word"],["2.5","work"],["2.5","world"],["3.1","after"],["3.1","another"],["3.1","down"],["3.1","first"],["3.1","full"],["3.1","month"],["3.1","new"],["3.1","number"],["3.1","other"],["3.1","over"],["3.1","pull"],["3.1","pulled"],["3.1","push"],["3.1","pushed"],["3.1","under"],["3.3","knew"],["3.3","know"],["3.3","Mr"],["3.3","Mr."],["3.3","Mrs."],["3.3","right"],["3.3","talk"],["3.3","walk"],["3.3","water"],["3.3","write"],["3.4","always"],["3.4","away"],["3.4","day"],["3.4","hour"],["3.4","may"],["3.4","our"],["3.4","people"],["3.4","say"],["3.4","says"],["3.4","today"],["3.4","way"],["3.5","called"],["3.5","friend"],["3.5","great"],["3.5","often"],["3.5","through"],["3.5","throughout"],["4.1","done"],["4.1","move"],["4.1","moved"],["4.1","none"],["4.1","paste"],["4.1","remove"],["4.1","removed"],["4.1","sure"],["4.1","taste"],["4.1","use"],["4.1","used"],["4.1","uses"],["4.1","using"],["4.1","waste"],["4.2","because"],["4.2","book"],["4.2","cause"],["4.2","ever"],["4.2","food"],["4.2","goes"],["4.2","going"],["4.2","good"],["4.2","however"],["4.2","look"],["4.2","never"],["4.2","took"],["4.2","whenever"],["4.2","wherever"],["4.3","altogether"],["4.3","nothing"],["4.3","once"],["4.3","please"],["4.3","pleased"],["4.3","pleases"],["4.3","together"],["4.3","year"],["4.4","again"],["4.4","against"],["4.4","around"],["4.4","found"],["4.4","important"],["4.4","part"],["4.4","place"],["4.4","sound"],["5.1","before"],["5.1","below"],["5.1","between"],["5.1","bought"],["5.1","brought"],["5.1","different"],["5.1","four"],["5.1","fourth"],["5.1","ought"],["5.1","several"],["5.1","thought"],["5.1","three"],["5.2","heart"],["5.2","house"],["5.2","houses"],["5.2","learn"],["5.2","learned"],["5.2","own"],["5.2","owned"],["5.2","owner"],["5.2","toward"],["5.3","beautiful"],["5.3","don't"],["5.3","person"],["5.3","pretty"],["5.3","woman"],["5.3","women"],["5.4","brother"],["5.4","daughter"],["5.4","father"],["5.4","mother"],["5.4","sister"],["5.4","son"],["5.4","ton"],["5.4","won"],["5.5","almost"],["5.5","early"],["5.5","families"],["5.5","family"],["5.5","since"],["5.5","soon"],["6.1","above"],["6.1","answer"],["6.1","few"],["6.1","love"],["6.1","minute"],["6.1","minutes"],["6.1","school"],["6.2","America"],["6.2","American"],["6.2","earth"],["6.2","island"],["6.2","mountain"],["6.2","ocean"],["6.3","eight"],["6.3","eighth"],["6.3","follow"],["6.3","large"],["6.3","laugh"],["6.3","laughter"],["6.3","lose"],["6.3","loses"],["6.3","losing"],["6.4","already"],["6.4","although"],["6.4","double"],["6.4","during"],["6.4","ready"],["6.4","though"],["6.4","triple"],["6.4","trouble"],["7.1","especially"],["7.1","excellent"],["7.1","false"],["7.1","necessary"],["7.1","police"],["7.1","special"],["7.1","special (especially)"],["7.2","arrange"],["7.2","change"],["7.2","danger"],["7.2","guess"],["7.2","guess (guest)"],["7.2","guest"],["7.2","length"],["7.2","length (strength)"],["7.2","orange"],["7.2","range"],["7.2","range (arrange, strange)"],["7.2","strange"],["7.2","stranger"],["7.2","strength"],["7.3","college"],["7.3","knowledge"],["7.3","physical"],["7.3","science"],["7.3","science (scientist, scientific)"],["7.3","scientific"],["7.3","scientist"],["7.3","watch"],["7.4","half (whole)"],["7.4","national"],["7.4","question (suggestion)"],["7.4","themselves (ourselves)"],["7.4","whom (whose)"],["7.5","body (anybody, everybody, nobody, somebody)"],["7.5","usual (usually)"],["7.5","usually (probably, either, neither)"],["7.5","won't"],["8.1","cover"],["8.1","discover"],["8.1","discover (recover)"],["8.1","door"],["8.1","door (floor, poor)"],["8.1","floor"],["8.1","hear"],["8.1","hear (heard)"],["8.1","heard"],["8.1","mirror"],["8.1","poor"],["8.1","pour"],["8.1","pour (tour)"],["8.1","recover"],["8.1","tour"],["8.2","area"],["8.2","garage"],["8.2","superior"],["8.2","varies"],["8.2","variety"],["8.2","vary"],["8.2","vary (varies, variety)"],["8.2","vocabulary"],["8.3","environment"],["8.3","experience"],["8.3","government"],["8.3","material"],["8.3","period"],["8.3","serious"],["8.4","course"],["8.4","course (source, resource, resources)"],["8.4","court"],["8.4","iron"],["8.4","library"],["8.4","purpose"],["8.4","resource"],["8.4","resources"],["8.4","source"],["8.5","color"],["8.5","figure"],["8.5","guarantee"],["8.5","search (research)"],["8.5","theory (theories)"],["9.1","certain (curtain, captain)"],["9.1","chamber"],["9.1","control"],["9.1","roll (poll, toll)"],["9.1","straight"],["9.2","beyond"],["9.2","company (accompany)"],["9.2","eye"],["9.2","hey (grey, obey, prey, survey)"],["9.2","money (honey)"],["9.3","issue (tissue)"],["9.3","shoe"],["9.3","tongue (broad, abroad)"],["9.3","truth (truly)"],["9.4","actual (actually)"],["9.4","caught (taught)"],["9.4","fashion"],["9.4","fought (sought)"],["9.4","region"],["9.5","country (couple, cousin)"],["9.5","enough (rough, tough)"],["9.5","thorough"],["9.5","touch"],["9.5","young"],["9.6","breathe"],["9.6","measure (pleasure, treasure)"],["9.6","pearl (earn)"],["9.6","prove (improve, approve, approval)"],["9.6","tomorrow"],["9.7","build (built)"],["9.7","buy (guy)"],["9.7","Europe (European)"],["9.7","guide"],["9.7","guilty"],["10.1","average"],["10.1","courage (encourage)"],["10.1","language"],["10.1","machine (machinery)"],["10.1","promise (promised)"],["10.2","disease"],["10.2","magazine"],["10.2","muscle"],["10.2","purchase"],["10.2","shoulder"],["10.3","calm (palm)"],["10.3","guard (guardian)"],["10.3","parent"],["10.3","salt"],["10.3","yeah"],["10.4","dozen (dozens)"],["10.4","fasten (fastened)"],["10.4","listen"],["10.4","spirit"],["10.4","wonder (wondering)"],["10.5","alter (alternative)"],["10.5","experiment (experimental)"],["10.5","expertise"],["10.5","hypotheses (analyses)"],["10.6","among"],["10.6","among (amongst)"],["10.6","amongst"],["10.6","automobile"],["10.6","gasoline"],["10.6","graduate"],["10.6","route"],["10.6","route (routine)"],["10.6","routine"],["11.1","dying"],["11.1","dying (lying)"],["11.1","equation"],["11.1","lying"],["11.1","mysterious"],["11.1","mystery"],["11.1","mystery (mysterious)"],["11.1","oxygen"],["11.1","pyramid"],["11.2","busy (business)"],["11.2","journey (journal)"],["11.2","secretary"],["11.2","worry (worries, worried)"],["11.3","algae"],["11.3","blood (flood, floods)"],["11.3","bureau"],["11.3","equal (equality)"],["11.3","height"],["11.4","anxious (anxiety)"],["11.4","die"],["11.4","foreign (lieutenant, soldier)"],["11.4","lie"],["11.4","movie (movies)"],["11.4","pie"],["11.4","series"],["11.4","tie"],["11.4","view (review)"],["11.5","bacteria"],["11.5","bacteria (criteria)"],["11.5","criteria"],["11.5","exterior"],["11.5","inferior"],["11.5","interior"],["11.5","interior (exterior)"],["11.5","prism"],["11.5","ulterior"],["11.5","union"]];

const WORD_ELEMENTS: ScopeItem[] = [["3.1","mid-"],["3.1","mis-"],["3.1","non-"],["3.1","trans-"],["3.1","un-"],["3.2","ab-"],["3.2","ad-"],["3.2","com-"],["3.2","con-"],["3.2","dis-"],["3.2","em-"],["3.2","en-"],["3.2","ex-"],["3.2","im-"],["3.2","in-"],["3.2","ob-"],["3.2","sub-"],["4.2","fore-"],["5.1","co-"],["5.1","de-"],["5.1","e-"],["5.1","pre-"],["5.1","pro-"],["5.1","re-"],["5.5","a-"],["5.5","o-"],["7.1","ac-"],["8.3","circum-"],["8.3","inter-"],["8.3","over-"],["8.3","per-"],["8.3","super-"],["8.3","under-"],["8.4","para-"],["11.1","hydro-"],["11.1","hyper-"],["11.1","hypo-"],["11.5","anti-"],["11.5","bio-"],["11.5","mini-"],["11.5","multi-"],["11.5","omni-"],["11.5","semi-"],["12.1","geo-"],["12.6","af-"],["12.6","at-"],["12.6","col-"],["12.6","il-"],["12.6","ir-"],["12.6","op-"],["12.6","suf-"],["12.6","sug-"],["1.6","-es"],["1.6","-s"],["3.5","-ed"],["3.5","-ing"],["4.4","-ive"],["6.1","-able"],["6.1","-en"],["6.1","-er"],["6.1","-est"],["6.1","-ful"],["6.1","-ish"],["6.1","-less"],["6.1","-ly"],["6.1","-ment"],["6.1","-ness"],["6.1","-or"],["6.1","-ty"],["6.1","-y"],["7.4","-ion"],["8.5","-ward"],["10.1","-ace"],["10.1","-age"],["10.1","-ate"],["10.1","-ice"],["10.1","-ile"],["10.1","-ine"],["10.1","-ite"],["10.5","-ability"],["10.5","-ably"],["10.5","-ance"],["10.5","-ancy"],["10.5","-ant"],["10.5","-ary"],["10.5","-ence"],["10.5","-ency"],["10.5","-ent"],["10.5","-ery"],["10.5","-ibility"],["10.5","-ible"],["10.5","-ibly"],["10.5","-ic"],["10.5","-ism"],["10.5","-ist"],["10.5","-ity"],["10.5","-ize"],["10.5","-ory"],["12.5","-al"],["12.5","-an"],["12.5","-ous"],["12.5","-ure"],["2.4","-fess-"],["2.4","-gress-"],["2.4","-mand-"],["2.4","-mit-"],["2.4","-pel-"],["2.4","-pend-"],["2.4","-press-"],["2.4","-rupt-"],["2.4","-sent-"],["2.4","-sist-"],["2.4","-stant-"],["2.4","-sult-"],["2.4","-tend-"],["2.4","-tent-"],["2.4","-vent-"],["2.5","-dict-"],["2.5","-duct-"],["2.5","-fect-"],["2.5","-flect-"],["2.5","-flict-"],["2.5","-ject-"],["2.5","-lect-"],["2.5","-pact-"],["2.5","-rect-"],["2.5","-sect-"],["2.5","-spect-"],["2.5","-struct-"],["2.5","-tact-"],["2.5","-tract-"],["2.5","-vict-"],["4.1","-clude-"],["4.1","-fuse-"],["4.1","-pose-"],["4.1","-pute-"],["4.1","-quire-"],["4.1","-scribe-"],["4.1","-spire-"],["4.1","-sume-"],["4.1","-vise-"],["4.1","-voke-"],["7.1","-cede-"],["7.1","-cept-"],["7.1","-cess-"],["7.1","-cide-"],["7.1","-cise-"],["7.1","-cite-"],["7.1","-duce-"],["7.1","-scend-"],["7.1","-sess-"],["7.1","-side-"],["7.2","-vince-"],["8.1","-fer-"],["8.1","-firm-"],["8.1","-form-"],["8.1","-part-"],["8.1","-port-"],["8.1","-serve-"],["8.1","-verse-"],["8.1","-vert-"],["9.1","-tain-"],["9.2","-ceed-"],["9.6","-crease-"],["10.6","-cred"],["10.6","-crit-"],["10.6","-estim-"],["10.6","-luct-"],["10.6","-nov-"],["10.6","-pet"],["11.4","-ceive-"],["12.2","-sign-"],["7.3","tele-"],["8.1","-therm-"],["8.1","-meter"],["8.3","-metry"],["11.1","hydro-"],["11.1","hyper-"],["11.5","bio-"],["11.5","-mania"],["11.5","-phobia"],["12.1","geo- / ge-"]];

// These are source-category boundaries in the single established cumulative
// repository. They are used for display classification only; the stored group
// profile remains one backward-compatible practicedWordElements array.
const PREFIXES = WORD_ELEMENTS.slice(0, 52);
const SUFFIXES = WORD_ELEMENTS.slice(52, 102);
const LATIN_ROOTS = WORD_ELEMENTS.slice(102, 172);
const GREEK_COMBINING_FORMS = WORD_ELEMENTS.slice(172);

export type WordElementBucket = 'affixes' | 'baseElements' | 'other';

export interface WordElementBuckets {
  affixes: string[];
  baseElements: string[];
  other: string[];
}

type LegacyWordElement = {
  value?: unknown;
  label?: unknown;
  text?: unknown;
  type?: unknown;
  category?: unknown;
  kind?: unknown;
};

const normalizedElement = (value: string) => value.trim().toLocaleLowerCase();
const categoryMap = new Map<string, WordElementBucket>();
const addCategory = (items: ScopeItem[], bucket: WordElementBucket) => {
  items.forEach(([, item]) => {
    const key = normalizedElement(item);
    // A few source inventories intentionally share a form. The first source
    // record is the established canonical display role for the flat v31 data.
    if (!categoryMap.has(key)) categoryMap.set(key, bucket);
  });
};

addCategory(PREFIXES, 'affixes');
addCategory(SUFFIXES, 'affixes');
addCategory(LATIN_ROOTS, 'baseElements');
addCategory(GREEK_COMBINING_FORMS, 'baseElements');

const textFromLegacyElement = (item: unknown): string | null => {
  if (typeof item === 'string') return item.trim() || null;
  if (!item || typeof item !== 'object') return null;
  const record = item as LegacyWordElement;
  for (const value of [record.value, record.label, record.text]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const legacyRoleBucket = (item: unknown): WordElementBucket | null => {
  if (!item || typeof item !== 'object') return null;
  const record = item as LegacyWordElement;
  const role = [record.type, record.category, record.kind]
    .find(value => typeof value === 'string' && value.trim());
  if (typeof role !== 'string') return null;
  const normalizedRole = role.trim().toLocaleLowerCase();
  if (['prefix', 'suffix', 'connective', 'affix', 'explicit affix'].includes(normalizedRole)) return 'affixes';
  if (['root', 'base', 'base element', 'latin base', 'greek base', 'greek combining form'].includes(normalizedRole)) return 'baseElements';
  return null;
};

/**
 * Derives visual Word Element sections without altering the stored combined
 * repository. Explicit legacy metadata wins; otherwise the established WRS
 * source category map is used. Delimiter appearance is never used to guess.
 */
export const classifyWordElements = (items: readonly unknown[]): WordElementBuckets => {
  const buckets: WordElementBuckets = { affixes: [], baseElements: [], other: [] };
  items.forEach(item => {
    const text = textFromLegacyElement(item);
    if (!text) return;
    const bucket = legacyRoleBucket(item) || categoryMap.get(normalizedElement(text)) || 'other';
    buckets[bucket].push(text);
  });
  return buckets;
};

const CONCEPTS: ScopeItem[] = [["1.1","Closed Syllable"],["2.2","Closed Syllable Blends"],["2.3","ild, ind, old, olt, ost"],["2.4","5-Sound Syllable"],["2.5","3-letter blends / 6 sounds"],["3.1","Schwa ə"],["3.1","VC/CV (Cactus Pattern)"],["3.1","VC/V (Relish Pattern)"],["3.2","V/CCV or VC/CV with Blends"],["3.3","ct Blend Division"],["4.1","Vowel-Consonant-e Syllable (v-e)"],["4.2","VC/CV (Multisyllabic v-e)"],["4.4","v and s added to closed syllables"],["4.4","v-e Exception (ive)"],["5.1","Open Syllable"],["5.2","V/CV Pattern"],["5.3","y as a vowel (Open Syllable /ē/)"],["5.5","Open Syllable Exceptions (Schwa a and i)"],["6.4","Final Stable Syllable (-le)"],["6.4","stle Exception"],["7.4","tion, sion"],["8.1","R-Controlled Syllable"],["8.4","ar/er followed by one vowel"],["8.4","vowel followed by rr"],["8.5","ar, or, ard ending /ər/"],["9.1","Double Vowel \"D\" Syllable"],["11.1","y as a Vowel (Three Types)"],["11.3","eigh and igh"],["11.4","ei and ie"],["11.5","i in an Open Syllable sounds"],["12.1","Split Vowels (Hiatus) V/V"],["12.5","-ture"],["1.2","ck Spelling Rule"],["1.2","Spelling options for /k/ and /w/ sounds"],["1.2","The Buddy Letter qu"],["1.2","wh Position Restriction"],["1.4","Bonus Letter Rule"],["1.6","Adding Suffixes -s and -es to Unchanging Base Words"],["1.6","Oral Spelling Suffix Procedure"],["2.2","/k/ in a blend at the beginning of a word"],["2.4","Five-Sound Syllable Procedure"],["2.5","Three-Letter Blend /k/ Spelling"],["3.1","/ik/ at the end of a multisyllabic word"],["3.1","Doubling to retain short vowel sound"],["3.2","Prefix Doubling Rule"],["3.5","-ed, -ing suffixes added to unchanging base words"],["4.1","Spelling of /k/ in a v-e Syllable"],["4.3","Multisyllabic Spelling Procedure"],["4.4","Final v-e /v/ Rule"],["4.4","Silent E for Closed Syllable /v/ or /s/"],["5.1","Open Syllable Letter Choice (y as /i/)"],["5.2","Open Syllable Prefix Procedure"],["5.3","Doubling Rule in Multisyllabic Words Ending in y"],["5.3","Open Syllable Letter Choice (y as /e/)"],["5.5","Schwa in Unaccented Open Syllables"],["6.1","Suffixes added to unchanging base words"],["6.2","Suffix -ed added to unchanging base words"],["6.3","Combining two suffixes to an unchanging base word"],["6.4","stle Exception Rule"],["7.1","Spelling Option Procedure With /s/ and /j/ Sounds"],["7.1","Ways to Spell /k/ (before e, i, or y)"],["7.2","Spelling Words With nce and nge"],["7.2","Trigraph /j/ (dge)"],["7.3","Spelling Words With Digraph ph"],["7.3","Trigraph /ch/ (tch)"],["7.4","Spelling Option Procedure for /shun/"],["7.5","Contractions Rule"],["7.5","Possessive Rules (Singular and Plural)"],["8.1","/k/ in r-controlled syllables"],["8.1","Jobs of Silent e (r-controlled)"],["8.1","Spelling Option Procedure for /er/"],["8.4","Doubling to retain short vowel sound (internal)"],["8.5","Spelling Option Procedure for /er/ at the End of Multisyllabic Words"],["8.5","The 'ard' Ending in Unstressed Syllables"],["9.2","/k/ after a double vowel"],["9.4","Generalizations for oi and oy"],["9.5","Generalizations for ou and ow"],["10.2","The Silent e and Suffix Rule (E-Dropping)"],["10.3","The 1:1:1 Doubling Rule Part I"],["10.4","The 1:1:1 Doubling Rule Part II"],["10.5","The /k/ to /s/ Sound Shift"],["11.1","y as a vowel (gym/reply/type)"],["11.2","The y + Suffix Rule"],["12.4","Greek and French /k/ Spelling"],["12.6","Assimilated (Chameleon) Prefixes"]];

const numericSubstep = (value: string) => value.split('.').map(Number);
const atOrBefore = (candidate: string, target: string) => {
  const [candidateStep, candidateSubstep] = numericSubstep(candidate);
  const [targetStep, targetSubstep] = numericSubstep(target);
  return candidateStep < targetStep || (candidateStep === targetStep && candidateSubstep <= targetSubstep);
};
const before = (candidate: string, target: string) => {
  const [candidateStep, candidateSubstep] = numericSubstep(candidate);
  const [targetStep, targetSubstep] = numericSubstep(target);
  return candidateStep < targetStep || (candidateStep === targetStep && candidateSubstep < targetSubstep);
};
const unique = (items: string[]) => [...new Set(items)];

export const cumulativeWrsScope = (substep: string) => {
  const phonemeCards = Object.values(WRS_PHONEME_MAP)
    .flat()
    .map(item => ({ introduced: item.introduced, label: '/' + item.phoneme + '/ → ' + item.graphemes.join(', ') }));

  return {
    reviewCardRepository: unique(phonemeCards.filter(item => before(item.introduced, substep)).map(item => item.label)),
    currentPhonemeCards: unique(phonemeCards.filter(item => item.introduced === substep).map(item => item.label)),
    practicedWordElements: unique(WORD_ELEMENTS.filter(([introduced]) => atOrBefore(introduced, substep)).map(([, item]) => item)),
    highFrequencyWords: unique(HIGH_FREQUENCY_WORDS.filter(([introduced]) => atOrBefore(introduced, substep)).map(([, item]) => item)),
    conceptsToWeave: unique(CONCEPTS.filter(([introduced]) => atOrBefore(introduced, substep)).map(([, item]) => item))
  };
};
