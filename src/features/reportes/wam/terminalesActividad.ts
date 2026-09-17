import type { TerminalesOnlineResponse } from "@/lib/wamApi/types";

export interface TerminalActividadRow {
  alias: string;
  pos: string;
  empresa: string;
  status: string;
  online: boolean;
  // null = nunca conectada (last_conn vino vacío); Infinity-like treatment for sorting.
  diasSinConexion: number | null;
}

const ESTADO_LABEL: Record<string, string> = { active: "Activa", idle: "Inactiva" };
export function estadoLabel(status: string, online: boolean): string {
  if (!online) return "Apagada";
  return ESTADO_LABEL[status] ?? "Activa";
}

const OTROS = "Otros";

function normWord(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// /api/terminales/online only gives a POS name string, no separate empresa field (unlike
// por_pos, which the API already annotates with `empresa` directly) — so empresa has to be
// inferred from the POS name. A plain substring match breaks on real naming drift (POS
// strings say "APUESTA DEP.LA 12", the real empresa row is "APUESTAS DEP. LA 12" — an
// extra "S"), so this compares just the first word of each, normalized, and accepts a
// match when one is a prefix of the other (≥4 chars) rather than requiring an exact word.
export function empresaFromPos(pos: string, empresaNombres: string[]): string {
  const posWord = normWord(pos.split(/[\s-]/)[0] ?? "");
  if (!posWord) return OTROS;
  for (const nombre of empresaNombres) {
    const empWord = normWord(nombre.split(/\s/)[0] ?? "");
    if (!empWord) continue;
    const [shorter, longer] = empWord.length <= posWord.length ? [empWord, posWord] : [posWord, empWord];
    if (shorter.length >= 4 && longer.startsWith(shorter)) return nombre;
  }
  return OTROS;
}

// wam_api.py's own docstring says the frontend is expected to compute "días apagada" from
// last_conn (a naive ISO timestamp in hora Perú, no timezone suffix) — v1 never actually
// built a screen that did this, so there's no v1 code to port here, just this one field.
//
// Both `last_conn` and "now" need to land in the SAME reference frame before subtracting.
// `last_conn` has no zone, but its Y-M-D-H-M-S values ARE hora Perú (matches every other
// hora_peru field this backend emits) — appending "Z" parses those same digits as if they
// were UTC, giving an epoch in a "Peru values read as UTC" frame. `peruNow()`-equivalent
// (Date.now() - 5h) lands "real now" in that exact same frame, so the two subtract
// correctly. (Do NOT also shift `ts` by 5h — that would double-shift it.)
export function normalizarActividad(
  terminales: TerminalesOnlineResponse["terminales"],
  empresaNombres: string[],
): TerminalActividadRow[] {
  const ahora = Date.now() - 5 * 60 * 60 * 1000;
  return terminales
    // "01-Electricline_1" is not a real client POS — a placeholder/internal bucket in WAM
    // (per the user 2026-09-12), not something to rank or count alongside real agencias.
    .filter((t) => t.pos !== "01-Electricline_1")
    .map((t) => {
      let dias: number | null = null;
      if (t.last_conn) {
        const ts = new Date(`${t.last_conn}Z`).getTime();
        if (!Number.isNaN(ts)) dias = Math.max(0, Math.floor((ahora - ts) / 86_400_000));
      }
      const pos = t.pos || "—";
      return {
        alias: t.alias,
        pos,
        empresa: empresaFromPos(pos, empresaNombres),
        status: t.status,
        online: t.online,
        diasSinConexion: dias,
      };
    });
}
