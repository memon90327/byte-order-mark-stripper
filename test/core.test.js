import test from 'node:test';
import assert from 'node:assert/strict';
import { stripBom, detectBom, BOM_TYPES } from '../src/index.js';

const utf8Bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
const utf16leBom = new Uint8Array([0xFF, 0xFE]);
const utf16beBom = new Uint8Array([0xFE, 0xFF]);
const utf32leBom = new Uint8Array([0xFF, 0xFE, 0x00, 0x00]);
const utf32beBom = new Uint8Array([0x00, 0x00, 0xFE, 0xFF]);

function concat(...chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

test('detectBom finds UTF-8 BOM', () => {
  const result = detectBom(concat(utf8Bom, new Uint8Array([0x61])));
  assert.deepEqual(result, { name: 'UTF-8', encoding: 'utf-8', length: 3 });
});

test('detectBom finds UTF-16LE BOM', () => {
  const result = detectBom(utf16leBom);
  assert.deepEqual(result, { name: 'UTF-16LE', encoding: 'utf-16le', length: 2 });
});

test('detectBom finds UTF-16BE BOM', () => {
  const result = detectBom(utf16beBom);
  assert.deepEqual(result, { name: 'UTF-16BE', encoding: 'utf-16be', length: 2 });
});

test('detectBom finds UTF-32LE BOM and does not confuse it with UTF-16LE', () => {
  const result = detectBom(utf32leBom);
  assert.deepEqual(result, { name: 'UTF-32LE', encoding: 'utf-32le', length: 4 });
});

test('detectBom finds UTF-32BE BOM', () => {
  const result = detectBom(utf32beBom);
  assert.deepEqual(result, { name: 'UTF-32BE', encoding: 'utf-32be', length: 4 });
});

test('detectBom returns null when no BOM is present', () => {
  assert.equal(detectBom(new Uint8Array([0x61, 0x62])), null);
  assert.equal(detectBom(new Uint8Array(0)), null);
});

test('detectBom does not treat a partial BOM as a match', () => {
  assert.equal(detectBom(new Uint8Array([0xEF, 0xBB])), null);
  assert.equal(detectBom(new Uint8Array([0xFF])), null);
});

test('stripBom removes a UTF-8 BOM and reports encoding', () => {
  const input = concat(utf8Bom, new Uint8Array([0x68, 0x69]));
  const { data, encoding, bomLength } = stripBom(input);
  assert.equal(encoding, 'utf-8');
  assert.equal(bomLength, 3);
  assert.deepEqual(Array.from(data), [0x68, 0x69]);
});

test('stripBom removes a UTF-16LE BOM', () => {
  const input = concat(utf16leBom, new Uint8Array([0x61, 0x00]));
  const { data, encoding, bomLength } = stripBom(input);
  assert.equal(encoding, 'utf-16le');
  assert.equal(bomLength, 2);
  assert.deepEqual(Array.from(data), [0x61, 0x00]);
});

test('stripBom removes a UTF-16BE BOM', () => {
  const input = concat(utf16beBom, new Uint8Array([0x00, 0x61]));
  const { data, encoding, bomLength } = stripBom(input);
  assert.equal(encoding, 'utf-16be');
  assert.equal(bomLength, 2);
  assert.deepEqual(Array.from(data), [0x00, 0x61]);
});

test('stripBom removes a UTF-32LE BOM', () => {
  const input = concat(utf32leBom, new Uint8Array([0x61, 0x00, 0x00, 0x00]));
  const { data, encoding, bomLength } = stripBom(input);
  assert.equal(encoding, 'utf-32le');
  assert.equal(bomLength, 4);
  assert.deepEqual(Array.from(data), [0x61, 0x00, 0x00, 0x00]);
});

test('stripBom removes a UTF-32BE BOM', () => {
  const input = concat(utf32beBom, new Uint8Array([0x00, 0x00, 0x00, 0x61]));
  const { data, encoding, bomLength } = stripBom(input);
  assert.equal(encoding, 'utf-32be');
  assert.equal(bomLength, 4);
  assert.deepEqual(Array.from(data), [0x00, 0x00, 0x00, 0x61]);
});

test('stripBom leaves input without a BOM untouched', () => {
  const input = new Uint8Array([0x61, 0x62, 0x63]);
  const { data, encoding, bomLength } = stripBom(input);
  assert.equal(encoding, null);
  assert.equal(bomLength, 0);
  assert.equal(data, input);
});

test('stripBom does not mutate the input buffer', () => {
  const input = concat(utf8Bom, new Uint8Array([0x68]));
  const copy = input.slice();
  stripBom(input);
  assert.deepEqual(Array.from(input), Array.from(copy));
});

test('stripBom handles a buffer that is exactly the UTF-8 BOM', () => {
  const { data, encoding, bomLength } = stripBom(utf8Bom);
  assert.equal(encoding, 'utf-8');
  assert.equal(bomLength, 3);
  assert.equal(data.length, 0);
});

test('stripBom handles a buffer that is exactly the UTF-32LE BOM', () => {
  const { data, encoding, bomLength } = stripBom(utf32leBom);
  assert.equal(encoding, 'utf-32le');
  assert.equal(bomLength, 4);
  assert.equal(data.length, 0);
});

test('BOM_TYPES exposes the supported encodings in longest-first order', () => {
  assert.deepEqual(
    BOM_TYPES.map((b) => b.encoding),
    ['utf-32le', 'utf-32be', 'utf-8', 'utf-16le', 'utf-16be']
  );
});
