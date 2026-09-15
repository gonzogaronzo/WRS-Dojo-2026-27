# WRS Dojo Canonical Part 7 Presentation v1

Status: working contract on draft PR #41. This is an application/runtime contract, not a claim that Wilson specifies a JSON schema or digital UI.

## Classroom model

Part 7 should behave like the physical spelling lesson rather than a separate game/cipher mode:

1. The teacher sees the next spelling target privately.
2. The student-facing display shows no target spelling before the attempt.
3. The teacher dictates the word or Word Element.
4. After the student attempt, the teacher reveals the exact source-specified representation.
5. Teacher advances or goes back. No Quick Practice or separate cipher workflow is required.

## Canonical data rule

`Part 7.data.spellingItems` is the presentation packet. The renderer must not infer syllabification, morphology, affix boundaries, card identity, or tile grouping from the raw word string.

Each item contains:

- `id`: stable item ID within the lesson
- `word`: teacher-private target before reveal
- `group`: `review`, `current`, or `word-element`
- `representation`: one of the supported explicit representations below
- `units`: the exact supplied cards/tiles to reveal, in display order
- optional `teacherCue`

Supported representations:

- `letter-sound-tiles`: one-syllable word represented with explicit Letter-Sound Tile units
- `syllable-cards`: multisyllabic word represented with explicit Syllable Card units
- `prefix-suffix-cards`: explicit affix/morphological card packet
- `word-element-cards`: explicit Latin-base / Greek combining-form cards

Supported unit roles currently include consonant, vowel, digraph/trigraph, vowel-team, r-controlled, welded, syllable, prefix, suffix, base-element, and Greek combining form.

## Affix rule

Affix identity is explicit data. A prefix unit must preserve the trailing hyphen (for example `un-`); a suffix unit must preserve the leading hyphen (for example `-ing`). The renderer uses the existing WRS Dojo yellow affix-card visual. It must reject malformed affix units rather than repairing or guessing the hyphen position.

## Privacy rule

Before reveal:

- teacher screen may show `word` and `teacherCue`
- student screen shows only a neutral listening state

After reveal:

- both screens may show the supplied cards/tiles
- private teacher cue remains teacher-only

## Fail-closed rule

If an item lacks an explicit supported representation, contains invalid unit roles, has malformed affix notation, or otherwise cannot be represented from supplied data, the canonical Part 7 runner must not derive a replacement representation from spelling. Legacy lessons that do not carry `spellingItems` may continue to use the existing legacy Part 7 surface during migration.

## Current 2.5 reference

`fixtures/canonical/3A-2.5-accuracy.canonical-v2.json` is the first full reference fixture using this contract. Its selected review/current words and Word Elements come from the existing source-grounded 3A 2.5 plan; the `spellingItems` packet supplies the digital representation explicitly so the renderer does not have to reconstruct it at runtime.
