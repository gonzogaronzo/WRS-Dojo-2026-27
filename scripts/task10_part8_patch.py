from pathlib import Path

spelling = Path('legacy/components/modules/Spelling.tsx')
text = spelling.read_text()
old = '''                  {isItemRevealed(currentSection.key, idx) ? (\n                    <div className="flex-1 animate-in fade-in slide-in-from-left-4 duration-300">\n                      {renderRevealedItem(text)}\n                    </div>\n                  ) : !readOnly ? (\n                    <div className="flex flex-1 items-center gap-4">\n                      <div className="rounded-lg bg-amber-100 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-amber-800">Teacher cue</div>\n                      <span className="text-xl md:text-2xl font-black font-serif text-stone-700">{teacherPromptForItem(text)}</span>\n                    </div>\n                  ) : (\n                    <div className="flex items-center gap-4 text-stone-200">\n                      <HelpCircle className="w-8 h-8 opacity-40" />\n                      <span className="text-xl font-serif italic opacity-40">{idx === currentItemIndex ? 'Listen and write. Waiting for teacher reveal.' : 'Waiting for teacher...'}</span>\n                    </div>\n                  )}'''
new = '''                  {isItemRevealed(currentSection.key, idx) ? (\n                    <div className="flex-1 animate-in fade-in slide-in-from-left-4 duration-300">\n                      {renderRevealedItem(text)}\n                    </div>\n                  ) : (\n                    <div\n                      data-part8-primary-state={idx === currentItemIndex ? 'listen-write' : 'waiting'}\n                      className="flex items-center gap-4 text-stone-300"\n                    >\n                      <HelpCircle className="w-8 h-8 opacity-40" />\n                      <span className="text-xl font-serif italic opacity-60">\n                        {idx === currentItemIndex ? 'Listen and write. Waiting for teacher reveal.' : 'Waiting for teacher...'}\n                      </span>\n                    </div>\n                  )}'''
if old in text:
    spelling.write_text(text.replace(old, new, 1))
elif 'data-part8-primary-state=' not in text:
    raise SystemExit('Expected Part 8 render block not found; refusing speculative edit')

test_file = Path('tests/part6-part8-preview-privacy.test.tsx')
tests = test_file.read_text()
marker = "test('teacher Part 8 primary list hides dictated source until Reveal'"
if marker not in tests:
    tests += r'''

const countVisibleSourceOccurrences = (markup: string, sourceText: string) => markup.split(sourceText).length - 1;
const renderTeacherPart8List = (tab: number, revealedItems: Record<string, boolean>) => renderToStaticMarkup(
  <Spelling
    data={dictation}
    lessonStep="2"
    lessonSubstep="5"
    viewMode="list"
    activeTab={tab}
    sectionOrderVersion={2}
    revealedItems={revealedItems}
  />
);

const teacherPart8Cases = [
  { tab: 0, key: 'sounds', sourceText: '/voip/' },
  { tab: 1, key: 'word-elements', sourceText: '-morphx-' },
  { tab: 2, key: 'real-words', sourceText: 'brindlex' },
  { tab: 3, key: 'nonsense-words', sourceText: 'splontx' },
  { tab: 4, key: 'phrases', sourceText: 'carry zx lantern' },
  { tab: 5, key: 'sentences', sourceText: 'The zx lantern blinked twice.' }
];

test('teacher Part 8 primary list hides dictated source until Reveal', () => {
  for (const item of teacherPart8Cases) {
    const currentMarker = `__part8-current__:${item.key}-0`;
    const hidden = renderTeacherPart8List(item.tab, { [currentMarker]: true });
    assert.match(hidden, /data-part8-primary-state="listen-write"/);
    assert.match(hidden, /Listen and write\. Waiting for teacher reveal\./);
    assert.equal(
      countVisibleSourceOccurrences(hidden, item.sourceText),
      1,
      `${item.key} source should appear only in the small teacher-only cue before Reveal, never in the primary dictation row`
    );

    const revealed = renderTeacherPart8List(item.tab, { [currentMarker]: true, [`${item.key}-0`]: true });
    assert.equal(revealed.includes('data-part8-primary-state="listen-write"'), false);
    assert.ok(
      countVisibleSourceOccurrences(revealed, item.sourceText) >= 2,
      `${item.key} source should appear in the revealed primary row after Reveal`
    );
  }
});
'''
    test_file.write_text(tests)
