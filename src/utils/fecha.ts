// `agencias.fecha_inicio` is a real, pre-existing v1 column stored as plain TEXT in
// es-PE locale format (e.g. "23/3/2026", zero-padding inconsistent — v1 and V2 both just
// call toLocaleDateString('es-PE'), whatever the browser produces). `fecha_pausa` and
// `fecha_baja` are new V2-only columns with no legacy data, stored as real ISO
// timestamptz. Both shapes can show up in the same UI, so these helpers detect which one
// they were given rather than assuming one format.
const DDMMYYYY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function formatFecha(value: string | null): string {
  if (!value) return "—";
  if (DDMMYYYY.test(value)) return value; // already es-PE text — display as-is
  return new Date(value).toLocaleDateString("es-PE");
}

// YYYY-MM-DD, comparable as a plain string — for range-filtering against a <input
// type="date"> value regardless of which of the two storage shapes the field uses.
export function fechaToSortable(value: string | null): string | null {
  if (!value) return null;
  const match = DDMMYYYY.exec(value);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return value.slice(0, 10);
}

// The other direction — a native <input type="date"> value (YYYY-MM-DD, or "" if
// cleared) back into each column's own storage shape, for manual edits in
// AgenciaFormDialog. fecha_inicio keeps the legacy text convention (so it stays
// consistent with the real historical data already in that column); fecha_pausa/
// fecha_baja use real ISO since they're new V2-only columns with nothing to match.
export function sortableToFechaInicio(value: string): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function sortableToIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toISOString();
}
