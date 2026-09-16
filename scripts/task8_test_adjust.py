from pathlib import Path

canonical = Path('tests/canonical-lesson-surfaces.test.tsx')
text = canonical.read_text()
text = text.replace('/>Listen<\\/span>/', '/>LISTEN<\\/span>/')
canonical.write_text(text)

null_safe = Path('tests/null-safe-render.test.tsx')
text = null_safe.read_text()
text = text.replace('assert.match(studentHtml, /Listen/);', 'assert.match(studentHtml, /LISTEN/);')
null_safe.write_text(text)

target = Path('tests/part6-part8-preview-privacy.test.tsx')
text = target.read_text()
old = "    assert.equal(shown.markup.includes(item.answer), true, `${item.key} missing after reveal`);"
new = "    assert.equal(JSON.stringify(shown.snapshot).includes(item.answer), true, `${item.key} missing from revealed payload`);\n    if (item.key === 'sounds') assert.match(shown.markup, /data-part8-reveal-kind=\\\"sound\\\"/);\n    else assert.equal(shown.markup.includes(item.answer), true, `${item.key} missing after reveal`);"
assert old in text
target.write_text(text.replace(old, new, 1))
