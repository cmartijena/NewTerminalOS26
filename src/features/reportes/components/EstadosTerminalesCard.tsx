import { Card } from "@/components/ui/Card";
import { TERMINAL_ESTADOS } from "@/lib/supabase/types";
import type { TerminalListItem } from "@/features/terminales/hooks/useTerminales";

// Same estado→color mapping as EstadoPill's `dot` (src/components/domain/EstadoPill.tsx)
// — kept separate rather than importing that map directly since EstadoPill only exposes
// the whole pill, not its color alone.
const BAR_COLOR: Record<string, string> = {
  "EN PRODUCCION": "bg-positive",
  DISPONIBLE: "bg-blue",
  ASIGNADO: "bg-blue",
  ALMACEN: "bg-t3",
  "EN TRASLADO": "bg-purple",
  "NO DISPONIBLE": "bg-negative",
  "EN REPARACION": "bg-amber",
  "DADA DE BAJA": "bg-t3",
};

interface Props {
  terminales: TerminalListItem[];
}

// Mirrors v1's Reportes → Sistema → "Estados de Terminales" (index.html ~line 4552-4555,
// renderReportes()) — a full breakdown across every estado, unlike Dashboard's StatRow
// (a curated subset of tiles). Estados with zero terminales are skipped, same as v1.
export function EstadosTerminalesCard({ terminales }: Props) {
  const total = terminales.length || 1;

  return (
    <Card className="p-4">
      <div className="mb-3 text-[13px] font-bold text-t2">Estados de terminales</div>
      <div className="flex flex-col gap-3">
        {TERMINAL_ESTADOS.map((estado) => {
          const count = terminales.filter((t) => t.estado === estado).length;
          if (count === 0) return null;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={estado}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="font-semibold text-t1">{estado}</span>
                <span className="font-mono text-t2">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-full bg-border/50">
                <div className={`h-full rounded-full ${BAR_COLOR[estado] ?? "bg-t3"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
