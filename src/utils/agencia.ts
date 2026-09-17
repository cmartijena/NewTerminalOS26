// Extracts the store/local number (e.g. "AG06") embedded in `agencias.pos`
// (e.g. "TINBET LIMA - AG06-ALISOS") — the same AG-number v1 parses out of this
// field for sorting (TerminaLV1/index.html ~line 4624, `_agNum`).
export function localNumberFromPos(pos: string | null): string | null {
  const match = pos?.match(/AG-?\s*(\d+)/i);
  return match ? `AG${match[1].padStart(2, "0")}` : null;
}

// The bare number behind localNumberFromPos, for sorting — 9999 for anything without a
// parseable AG-number so those agencias sort last, same fallback v1's _agNum() uses
// (TerminaLV1/index.html ~line 4624).
export function localNumberValue(pos: string | null): number {
  const match = pos?.match(/AG-?\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 9999;
}
