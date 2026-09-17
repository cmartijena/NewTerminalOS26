export interface TerminalesOnlineResponse {
  online: number;
  total: number;
  terminales: { alias: string; pos: string; status: string; online: boolean; last_conn: string }[];
  fecha_peru: string;
}

// One row per POS (agencia) for a date range — `/api/reporte/por_pos`. The API already
// returns both the raw display strings (e.g. "Cash in": "$2,122.00") AND pre-parsed
// underscore-prefixed numbers (confirmed live 2026-09-09) — always prefer the `_x` fields,
// the display strings are just what v1's UI showed directly.
export interface PorPosFila {
  POS: string;
  empresa: string;
  local: string;
  codigo_ag: string;
  Spins: string;
  RTP: string;
  _cash_in: number;
  _paid_out: number;
  _ticket_out: number;
  _gross_in: number;
  _gross_net: number;
  _gross_out: number;
  _amount_played: number;
  _amount_won: number;
  [key: string]: unknown;
}

export interface PorPosResponse {
  fecha_from: string;
  fecha_to: string;
  filas: PorPosFila[];
}

// One row per game for a date range — `/api/reporte/por_juego`. Unlike por_pos, only the
// underscore/plain numeric fields exist here, no display-string duplicates.
export interface PorJuegoItem {
  juego: string;
  spins: number;
  pct: number;
  rtp: string;
  _cash_in: number;
  _gross_in: number;
  _gross_net: number;
  _gross_out: number;
  _ticket_out: number;
  _amount_played: number;
  _amount_won: number;
}

export interface PorJuegoResponse {
  fecha_from: string;
  fecha_to: string;
  juegos: PorJuegoItem[];
}

// `/api/reporte?grouping=operator` — same shape/source as `/api/hoy` (which is just this
// same call hardcoded to "today"), but parameterized for any date range. This is the
// authoritative WAM "Cash Activity" report (Money in/out/Cash balance/Paid tickets) —
// confirmed live 2026-09-09 to match the real WAM admin UI exactly. Per-POS breakdown
// endpoints (por_pos) do NOT reconcile 1:1 with this on total_out/balance (verified: same
// Cash In, different Money out) — that's a real property of WAM's own two report
// groupings, not a bug, so don't derive these 4 numbers by summing por_pos rows.
export interface ReporteOperadorResponse {
  fecha_from: string;
  fecha_to: string;
  filas: Record<string, unknown>[];
  headers: string[];
  total_in: number;
  total_out: number;
  balance: number;
  registros: number;
  actualizado: string;
}

export interface HoyResponse {
  filas: Record<string, unknown>[];
  headers: string[];
  total_in: number;
  total_out: number;
  balance: number;
  registros: number;
  fecha_from: string;
  fecha_to: string;
  actualizado: string;
  hora_peru: string;
}
