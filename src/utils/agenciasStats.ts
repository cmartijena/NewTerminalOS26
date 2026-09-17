import { AGENCIA_ESTADOS, type AgenciaEstado } from "@/lib/supabase/types";

export function countByAgenciaEstado(items: { estado: AgenciaEstado }[]): Record<AgenciaEstado, number> {
  const counts = Object.fromEntries(AGENCIA_ESTADOS.map((e) => [e, 0])) as Record<AgenciaEstado, number>;
  for (const item of items) {
    if (item.estado in counts) counts[item.estado] += 1;
  }
  return counts;
}
