import type { PorPosFila } from "@/lib/wamApi/types";

export interface TicketRow {
  empresa: string;
  local: string;
  pos: string;
  cashIn: number;
  ticketOut: number;
  grossIn: number;
  grossOut: number;
  grossNet: number;
  spins: number;
  rtp: string;
  amountPlayed: number;
  amountWon: number;
}

// Mirrors v1's wamRepNormalizarFilas (index.html ~line 9169), simplified: the live API
// already returns the underscore-prefixed parsed numbers directly (confirmed 2026-09-09),
// so there's no need for v1's fallback that re-parsed the "$1,234.56"-style display
// strings itself. `ticketOut` keeps v1's same preference (paid_out when present, else
// ticket_out) — v1 calls this combined value "money_out".
export function normalizarFilas(filas: PorPosFila[]): TicketRow[] {
  return filas
    .map((f): TicketRow => ({
      empresa: f.empresa || "—",
      local: f.local || "—",
      pos: f.POS || "—",
      cashIn: f._cash_in ?? 0,
      ticketOut: f._paid_out > 0 ? f._paid_out : (f._ticket_out ?? 0),
      grossIn: f._gross_in ?? 0,
      grossOut: f._gross_out ?? 0,
      grossNet: f._gross_net ?? 0,
      spins: Number(f.Spins) || 0,
      rtp: f.RTP || "—",
      amountPlayed: f._amount_played ?? 0,
      amountWon: f._amount_won ?? 0,
    }))
    .filter((r) => r.pos !== "—" && r.pos.length > 2);
}
