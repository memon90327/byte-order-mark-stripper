# byte-order-mark-stripper

Detects and removes UTF-8, UTF-16, and UTF-32 byte order marks from file contents while reporting the detected encoding.

```js
import { stripBom } from 'byte-order-mark-stripper';

const bytes = new Uint8Array([0xEF, 0xBB, 0xBF, 0x68, 0x69]);
const { data, encoding, bomLength } = stripBom(bytes);

encoding;   // 'utf-8'
bomLength;  // 3
data;       // Uint8Array [ 0x68, 0x69 ]
```

## Why this exists

Text files occasionally begin with a byte order mark, and code that reads them often treats those bytes as content: a leading `\uFEFF` in a parsed JSON string, a stray `ï»¿` in a CSV header, or a UTF-16 file that decodes to garbage because the reader assumed UTF-8. This library answers two questions in one pass: does a BOM exist, and which encoding does it indicate?

The trade-off is deliberate. `stripBom` does not decode text and does not guess an encoding when no BOM is present. It only removes a leading mark and reports what it found. Guessing is the caller's job, because the bytes alone rarely justify a guess, and a library that silently picks an encoding causes worse bugs than one that returns `null`.

## API

### `stripBom(input)`

Returns `{ data, encoding, bomLength }`.

- `input`: a `Uint8Array` (or any value accepted by the `Uint8Array` constructor).
- `data`: a new `Uint8Array` with the BOM removed. When no BOM is present, this is the original buffer, unchanged.
- `encoding`: one of `'utf-8'`, `'utf-16le'`, `'utf-16be'`, `'utf-32le'`, `'utf-32be'`, or `null`.
- `bomLength`: the number of bytes removed, or `0`.

The input is never mutated.

### `detectBom(input)`

Returns `{ name, encoding, length }` for the detected BOM, or `null`. `name` is the upper-case label (`'UTF-8'`, `'UTF-16LE'`, `'UTF-16BE'`, `'UTF-32LE'`, `'UTF-32BE'`).

### `BOM_TYPES`

A frozen array of the supported BOM definitions, ordered longest-first. This order matters: the UTF-32LE BOM begins with the UTF-16LE BOM, so detection must test the longer sequence first. Exposing the list lets callers build their own scanners without duplicating the byte tables.

## The awkward edge

The UTF-32LE BOM (`FF FE 00 00`) starts with the UTF-16LE BOM (`FF FE`). A naive detector that scans shortest-first will label a UTF-32LE file as UTF-16LE and leave two zero bytes in the content. This library checks UTF-32 before UTF-16 for exactly that reason, and there is a test pinning the behaviour.

A related case: a file whose content genuinely begins with `FF FE` but is not UTF-16LE is indistinguishable from a BOM at the byte level. The library reports it as UTF-16LE. If your format can legitimately start with those bytes, call `detectBom` and inspect the result rather than calling `stripBom` blindly.
