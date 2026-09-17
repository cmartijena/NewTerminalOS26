import type { AgenciaEstado } from "@/lib/supabase/types";

const ESTADO_STYLE: Record<AgenciaEstado, { bg: string; color: string; dot: string }> = {
  "EN PRODUCCION": { bg: "bg-positive-tint", color: "text-positive", dot: "bg-positive" },
  PENDIENTE: { bg: "bg-amber-tint", color: "text-amber", dot: "bg-amber" },
  INACTIVA: { bg: "bg-muted-slice", color: "text-t2", dot: "bg-t3" },
  "DADA DE BAJA": { bg: "bg-negative-tint", color: "text-negative", dot: "bg-negative" },
};

export function AgenciaEstadoPill({ estado }: { estado: AgenciaEstado }) {
  const style = ESTADO_STYLE[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold ${style.bg} ${style.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {estado}
    </span>
  );
}
