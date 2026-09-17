import type { TerminalEstadoDisplay } from "@/lib/supabase/estadoMapping";

const ESTADO_STYLE: Record<TerminalEstadoDisplay, { bg: string; color: string; dot: string }> = {
  "EN PRODUCCION": { bg: "bg-positive-tint", color: "text-positive", dot: "bg-positive" },
  DISPONIBLE: { bg: "bg-blue-tint", color: "text-blue", dot: "bg-blue" },
  ASIGNADO: { bg: "bg-blue-tint", color: "text-blue", dot: "bg-blue" },
  ALMACEN: { bg: "bg-muted-slice", color: "text-t2", dot: "bg-t3" },
  "EN TRASLADO": { bg: "bg-purple-tint", color: "text-purple", dot: "bg-purple" },
  "NO DISPONIBLE": { bg: "bg-negative-tint", color: "text-negative", dot: "bg-negative" },
  "EN REPARACION": { bg: "bg-amber-tint", color: "text-amber", dot: "bg-amber" },
  "DADA DE BAJA": { bg: "bg-muted-slice", color: "text-t2", dot: "bg-t3" },
};

export function EstadoPill({ estado }: { estado: TerminalEstadoDisplay }) {
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
