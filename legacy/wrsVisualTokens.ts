export const WRS_TILE_VISUALS = {
  width: 49,
  height: 43,
  borderRadius: 7,
  border: '1px solid rgba(30,40,45,.35)',
  shadow: '0 2px 4px rgba(0,0,0,.26)',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 19,
  affixWidth: 76,
  affixFontSize: 21,
  colors: {
    consonantIvory: '#f4edcf',
    consonantText: '#273037',
    vowelSalmon: '#e7a18c',
    vowelText: '#302724',
    weldedGreen: '#87aa82',
    weldedText: '#1f2a20',
    affixYellow: '#efd363',
    affixText: '#302d1e'
  }
} as const;

/**
 * Neutral physical-card values are intentionally plain. Wilson source materials
 * establish white Latin-base/Syllable cards and gray Greek combining-form cards,
 * but the project does not currently have a source-grounded digital hex value for
 * those neutral papers. Do not treat these neutral hex values as official Wilson
 * color specifications.
 */
export const WRS_NEUTRAL_CARD_VISUALS = {
  white: '#ffffff',
  ivoryPaper: '#fffdf7',
  greekGray: '#d6d6d2',
  border: '#77746d',
  text: '#202428',
  radius: 4,
  shadow: '0 2px 4px rgba(0,0,0,.18)'
} as const;

export type WrsSemanticVisualRole =
  | 'consonant'
  | 'consonant-digraph'
  | 'consonant-trigraph'
  | 'vowel'
  | 'vowel-team'
  | 'r-controlled'
  | 'welded'
  | 'prefix'
  | 'suffix'
  | 'base-element'
  | 'greek-combining-form';

export const getWrsSemanticCardVisual = (role: WrsSemanticVisualRole) => {
  switch (role) {
    case 'consonant':
    case 'consonant-digraph':
    case 'consonant-trigraph':
      return {
        background: WRS_TILE_VISUALS.colors.consonantIvory,
        color: WRS_TILE_VISUALS.colors.consonantText,
        kind: 'tile' as const
      };
    case 'vowel':
    case 'vowel-team':
    case 'r-controlled':
      return {
        background: WRS_TILE_VISUALS.colors.vowelSalmon,
        color: WRS_TILE_VISUALS.colors.vowelText,
        kind: 'tile' as const
      };
    case 'welded':
      return {
        background: WRS_TILE_VISUALS.colors.weldedGreen,
        color: WRS_TILE_VISUALS.colors.weldedText,
        kind: 'tile' as const
      };
    case 'prefix':
    case 'suffix':
      return {
        background: WRS_TILE_VISUALS.colors.affixYellow,
        color: WRS_TILE_VISUALS.colors.affixText,
        kind: 'affix' as const
      };
    case 'base-element':
      return {
        background: WRS_NEUTRAL_CARD_VISUALS.white,
        color: WRS_NEUTRAL_CARD_VISUALS.text,
        kind: 'word-element' as const
      };
    case 'greek-combining-form':
      return {
        background: WRS_NEUTRAL_CARD_VISUALS.greekGray,
        color: WRS_NEUTRAL_CARD_VISUALS.text,
        kind: 'word-element' as const
      };
  }
};
