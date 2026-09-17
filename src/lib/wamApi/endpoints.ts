import { wamFetch } from "./client";
import type {
  HoyResponse,
  PorJuegoResponse,
  PorPosResponse,
  ReporteOperadorResponse,
  TerminalesOnlineResponse,
} from "./types";

export function getHoy(params?: { grouping?: string; nocache?: boolean }) {
  return wamFetch<HoyResponse>("/api/hoy", { params });
}

export function getTerminalesOnline(params?: { nocache?: boolean }) {
  return wamFetch<TerminalesOnlineResponse>("/api/terminales/online", { params });
}

// date_from/date_to are full "YYYY-MM-DD HH:mm:ss" strings (callers append " 00:00:00"/
// " 23:59:59" to a plain date, matching v1's own convention).
export function getPorPos(params: { date_from: string; date_to: string; nocache?: boolean }) {
  return wamFetch<PorPosResponse>("/api/reporte/por_pos", { params });
}

export function getPorJuego(params: { date_from: string; date_to: string; nocache?: boolean }) {
  return wamFetch<PorJuegoResponse>("/api/reporte/por_juego", { params, useQuerySecret: true });
}

// The authoritative Money in/out/Cash balance/Paid tickets for any date range — see the
// note on ReporteOperadorResponse. `/api/hoy` is this same call hardcoded to "today".
export function getReporteOperador(params: { date_from: string; date_to: string; nocache?: boolean }) {
  return wamFetch<ReporteOperadorResponse>("/api/reporte", { params: { ...params, grouping: "operator" } });
}
