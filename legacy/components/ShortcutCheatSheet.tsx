import React from 'react';

interface ShortcutCheatSheetProps {
  /** Part 2 keys only act while Part 2 is showing; dim them otherwise. */
  part2Active: boolean;
  onClose: () => void;
}

const PART2_SHORTCUTS: Array<[string, string]> = [
  ['Space / →', 'Place the next card (pull stack), otherwise next move'],
  ['←', 'Return the last card to the stack, otherwise previous move'],
  ['Enter', 'Lay out the whole word (pull stack)']
];

const GENERAL_SHORTCUTS: Array<[string, string]> = [
  ['Page Down', 'Next Part (stops at Part 10)'],
  ['Page Up', 'Previous Part (stops at Part 1)'],
  ['?', 'Show or hide this list'],
  ['Esc', 'Close this list']
];

const Row: React.FC<{ keys: string; text: string }> = ({ keys, text }) => (
  <div className="flex items-baseline gap-4 py-1">
    <kbd className="min-w-[7rem] rounded-md border border-stone-300 bg-stone-50 px-2 py-0.5 text-center text-xs font-black text-stone-800">{keys}</kbd>
    <span className="text-sm text-stone-700">{text}</span>
  </div>
);

const ShortcutCheatSheet: React.FC<ShortcutCheatSheetProps> = ({ part2Active, onClose }) => (
  <div
    data-shortcut-cheat-sheet
    role="dialog"
    aria-label="Keyboard shortcuts"
    className="fixed bottom-6 right-6 z-[300] w-[26rem] max-w-[calc(100vw-3rem)] rounded-2xl border border-stone-300 bg-white p-5 shadow-2xl"
  >
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Keyboard shortcuts</h2>
      <button type="button" onClick={onClose} aria-label="Close shortcuts" className="text-xs font-bold text-stone-400 hover:text-stone-700">Esc</button>
    </div>
    <p className={`mt-2 text-[11px] font-black uppercase tracking-wider text-stone-400 ${part2Active ? '' : 'opacity-60'}`}>
      Part 2 runner{part2Active ? '' : ' (when Part 2 is showing)'}
    </p>
    <div className={part2Active ? '' : 'opacity-50'}>
      {PART2_SHORTCUTS.map(([keys, text]) => <Row key={keys} keys={keys} text={text} />)}
    </div>
    <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-stone-400">Lesson Parts</p>
    {GENERAL_SHORTCUTS.map(([keys, text]) => <Row key={keys} keys={keys} text={text} />)}
  </div>
);

export default ShortcutCheatSheet;
