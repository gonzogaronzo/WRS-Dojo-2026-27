import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const atlasPartNames = Array.from({ length: 8 }, (_, index) => `atlas-${String(index + 1).padStart(2, '0')}.b64`);
const expectedSha256 = '0c16eebb7fb1c089b29d3168ef79257530aa685d3f489809b05397a1a1bbe148';
const expectedByteLength = 46764;
const expectedWidth = 1400;
const expectedHeight = 1260;

const loadAtlas = async () => {
  const parts = await Promise.all(atlasPartNames.map(name =>
    readFile(fileURLToPath(new URL(`../functions/assets/word-element-mnemonic-atlas/${name}`, import.meta.url)), 'utf8')
  ));
  const canonicalParts = parts.map((part, index) => {
    const compact = part.replace(/\s+/g, '');
    return index < atlasPartNames.length - 1 ? compact.slice(0, 8000) : compact;
  });
  return Buffer.from(canonicalParts.join(''), 'base64');
};

test('protected word-element mnemonic atlas reconstructs byte-for-byte', async () => {
  const atlas = await loadAtlas();
  assert.equal(atlas.length, expectedByteLength);
  assert.equal(createHash('sha256').update(atlas).digest('hex'), expectedSha256);
  assert.deepEqual([...atlas.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(atlas.readUInt32BE(16), expectedWidth);
  assert.equal(atlas.readUInt32BE(20), expectedHeight);
});
