// Ported verbatim from v1's index.html (mapearEstado / estadoParaSupa, ~line 2543) —
// the raw `terminales.estado` column and the state the UI shows/filters on are NOT the
// same value. Read paths must map raw -> display; write paths must map display -> raw.

export const TERMINAL_ESTADOS_DISPLAY = [
  "DISPONIBLE",
  "ASIGNADO",
  "EN PRODUCCION",
  "NO DISPONIBLE",
  "ALMACEN",
  "EN TRASLADO",
  "EN REPARACION",
  "DADA DE BAJA",
] as const;

export type TerminalEstadoDisplay = (typeof TERMINAL_ESTADOS_DISPLAY)[number];

const RAW_TO_DISPLAY: Record<string, TerminalEstadoDisplay> = {
  ACTIVO: "EN PRODUCCION",
  INACTIVO: "DISPONIBLE",
  "NO DISPONIBLE": "NO DISPONIBLE",
  EN_TRASLADO: "EN TRASLADO",
  MANTENIMIENTO: "NO DISPONIBLE",
};

const DISPLAY_TO_RAW: Record<TerminalEstadoDisplay, string> = {
  "EN PRODUCCION": "ACTIVO",
  DISPONIBLE: "INACTIVO",
  "NO DISPONIBLE": "NO DISPONIBLE",
  ASIGNADO: "ASIGNADO",
  ALMACEN: "ALMACEN",
  "EN TRASLADO": "EN_TRASLADO",
  "EN REPARACION": "NO DISPONIBLE",
  "DADA DE BAJA": "DADA DE BAJA",
};

export function mapearEstado(raw: string | null | undefined): TerminalEstadoDisplay {
  if (!raw) return "NO DISPONIBLE";
  return RAW_TO_DISPLAY[raw] ?? (raw as TerminalEstadoDisplay);
}

export function estadoParaSupa(display: TerminalEstadoDisplay): string {
  return DISPLAY_TO_RAW[display] ?? display;
}
