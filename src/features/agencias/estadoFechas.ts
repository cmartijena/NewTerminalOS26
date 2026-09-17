import type { AgenciaEstado, AgenciaRow } from "@/lib/supabase/types";

// Auto-stamps the matching date whenever an agencia's estado transitions into it —
// EN PRODUCCION -> fecha_inicio, INACTIVA -> fecha_pausa, DADA DE BAJA -> fecha_baja.
// Each call overwrites with "now", so the field always reflects the most recent time the
// agencia entered that state (a reactivation after a pause updates fecha_inicio again,
// rather than preserving the very first start date) — no history of prior transitions is
// kept, just the latest. PENDIENTE has no matching date field, so it patches nothing.
//
// fecha_inicio is a real, pre-existing v1 column (TEXT, es-PE locale format, e.g.
// "23/3/2026") with real historical data across every agencia — v1 can still write to it
// directly too, so it must keep using the exact same toLocaleDateString('es-PE') shape,
// not switch to ISO. fecha_pausa/fecha_baja are new V2-only columns (timestamptz), so
// they use a real ISO string instead — see src/utils/fecha.ts for how both get displayed
// and compared consistently despite the differing storage shape.
export function estadoFechaPatch(
  estado: AgenciaEstado,
): Partial<Pick<AgenciaRow, "fecha_inicio" | "fecha_pausa" | "fecha_baja">> {
  const now = new Date();
  switch (estado) {
    case "EN PRODUCCION":
      return { fecha_inicio: now.toLocaleDateString("es-PE") };
    case "INACTIVA":
      return { fecha_pausa: now.toISOString() };
    case "DADA DE BAJA":
      return { fecha_baja: now.toISOString() };
    default:
      return {};
  }
}
