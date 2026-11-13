const BOMS = [
  { name: 'UTF-32LE', bytes: [0xFF, 0xFE, 0x00, 0x00], encoding: 'utf-32le' },
  { name: 'UTF-32BE', bytes: [0x00, 0x00, 0xFE, 0xFF], encoding: 'utf-32be' },
  { name: 'UTF-8',    bytes: [0xEF, 0xBB, 0xBF],       encoding: 'utf-8' },
  { name: 'UTF-16LE', bytes: [0xFF, 0xFE],             encoding: 'utf-16le' },
  { name: 'UTF-16BE', bytes: [0xFE, 0xFF],             encoding: 'utf-16be' }
];

/**
 * All supported BOM definitions, ordered so that longer byte sequences are
 * checked before their shorter prefixes. UTF-32LE must be tested before
 * UTF-16LE because the UTF-32LE BOM starts with the UTF-16LE BOM.
 */
export const BOM_TYPES = Object.freeze(
  BOMS.map((bom) => Object.freeze({ name: bom.name, bytes: Object.freeze(bom.bytes.slice()), encoding: bom.encoding }))
);

function startsWithBytes(buf, prefix) {
  if (buf.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (buf[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Detects the byte order mark at the start of the given buffer.
 *
 * Detection uses the longest match first so that a UTF-32LE BOM is not
 * mistaken for a UTF-16LE BOM (the two share a two-byte prefix).
 *
 * @param {Uint8Array} input - Raw bytes to inspect.
 * @returns {{ name: string, encoding: string, length: number } | null}
 *   The detected BOM type, its encoding label, and its byte length, or null.
 */
export function detectBom(input) {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  for (const bom of BOMS) {
    if (startsWithBytes(buf, bom.bytes)) {
      return { name: bom.name, encoding: bom.encoding, length: bom.bytes.length };
    }
  }
  return null;
}

/**
 * Strips a leading byte order mark from the given buffer and reports which
 * encoding was detected.
 *
 * The input is never mutated. When no BOM is present the original buffer is
 * returned unchanged (same reference) and encoding is null, which keeps the
 * common no-BOM path allocation-free.
 *
 * @param {Uint8Array} input - Raw bytes to process.
 * @returns {{ data: Uint8Array, encoding: string | null, bomLength: number }}
 */
export function stripBom(input) {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  const detected = detectBom(buf);
  if (!detected) {
    return { data: buf, encoding: null, bomLength: 0 };
  }
  const data = buf.slice(detected.length);
  return { data, encoding: detected.encoding, bomLength: detected.length };
}
