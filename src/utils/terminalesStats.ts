import { TERMINAL_MODELOS, type TerminalModelo } from "@/lib/supabase/types";
import type { TerminalEstadoDisplay } from "@/lib/supabase/estadoMapping";

export interface TerminalesEstadoCounts {
  disponibles: number;
  asignadas: number;
  enProduccion: number;
  noDisponible: number;
  enTraslado: number;
  enAlmacen: number;
}

export function countByEstado(items: { estado: TerminalEstadoDisplay }[]): TerminalesEstadoCounts {
  const counts: TerminalesEstadoCounts = {
    disponibles: 0,
    asignadas: 0,
    enProduccion: 0,
    noDisponible: 0,
    enTraslado: 0,
    enAlmacen: 0,
  };
  for (const item of items) {
    switch (item.estado) {
      case "DISPONIBLE":
        counts.disponibles += 1;
        break;
      case "ASIGNADO":
        counts.asignadas += 1;
        break;
      case "EN PRODUCCION":
        counts.enProduccion += 1;
        break;
      case "NO DISPONIBLE":
        counts.noDisponible += 1;
        break;
      case "EN TRASLADO":
        counts.enTraslado += 1;
        break;
      case "ALMACEN":
        counts.enAlmacen += 1;
        break;
    }
  }
  return counts;
}

export function countByModelo(items: { modelo: string | null }[]): Record<TerminalModelo, number> {
  const counts = Object.fromEntries(TERMINAL_MODELOS.map((m) => [m, 0])) as Record<TerminalModelo, number>;
  for (const item of items) {
    const modelo = item.modelo?.toUpperCase();
    if (modelo && modelo in counts) counts[modelo as TerminalModelo] += 1;
  }
  return counts;
}
