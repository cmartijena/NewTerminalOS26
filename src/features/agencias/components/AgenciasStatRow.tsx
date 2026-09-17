import { AGENCIA_ESTADOS, type AgenciaEstado } from "@/lib/supabase/types";
import { countByAgenciaEstado } from "@/utils/agenciasStats";
import { cn } from "@/utils/cn";

const ESTADO_STYLE: Record<AgenciaEstado, { badgeBg: string; badgeColor: string }> = {
  "EN PRODUCCION": { badgeBg: "bg-positive-tint", badgeColor: "text-positive" },
  PENDIENTE: { badgeBg: "bg-amber-tint", badgeColor: "text-amber" },
  INACTIVA: { badgeBg: "bg-muted-slice", badgeColor: "text-t2" },
  "DADA DE BAJA": { badgeBg: "bg-negative-tint", badgeColor: "text-negative" },
};

interface Props {
  agencias: { estado: AgenciaEstado }[];
  activeEstado: string;
  onSelectEstado: (estado: string) => void;
}

export function AgenciasStatRow({ agencias, activeEstado, onSelectEstado }: Props) {
  const counts = countByAgenciaEstado(agencias);

  return (
    <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-4">
      {AGENCIA_ESTADOS.map((estado) => {
        const active = activeEstado === estado;
        const style = ESTADO_STYLE[estado];
        return (
          <button
            type="button"
            key={estado}
            onClick={() => onSelectEstado(active ? "" : estado)}
            className={cn(
              "rounded-[20px] border bg-surface p-4 text-left transition-colors",
              active ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-t3",
            )}
          >
            <div className={`font-mono text-[21px] font-bold ${style.badgeColor}`}>{counts[estado]}</div>
            <div className="text-[11px] font-bold text-t2">{estado}</div>
          </button>
        );
      })}
    </div>
  );
}
