import type { PorJuegoItem } from "@/lib/wamApi/types";

export interface JuegoRow {
  codigo: string;
  nombre: string;
  spins: number;
  cashIn: number;
  grossNet: number;
  rtp: string;
}

// Mirrors v1's Ranking Juegos "clean name" derivation (index.html ~line 6985+): WAM's game
// codes end in a 3-char suffix like "4G9" (a variant/build code) and use underscores
// instead of spaces — strip both for a human-readable name, keep the raw code as-is for
// reference.
export function nombreLimpio(codigo: string): string {
  return codigo.replace(/[0-9][A-Z][0-9]$/, "").replace(/_/g, " ");
}

export function normalizarJuegos(juegos: PorJuegoItem[]): JuegoRow[] {
  return juegos
    // WAM returns a "None" pseudo-game row for cash movements not tied to any specific
    // game (its cash_in matches the whole day's total exactly, confirmed live 2026-09-10)
    // — not a real game, would otherwise show up as a top result by Cash In.
    .filter((j) => j.juego && j.juego !== "None")
    .map((j) => ({
      codigo: j.juego,
      nombre: nombreLimpio(j.juego),
      spins: j.spins ?? 0,
      cashIn: j._cash_in ?? 0,
      grossNet: j._gross_net ?? 0,
      rtp: j.rtp || "—",
    }));
}
