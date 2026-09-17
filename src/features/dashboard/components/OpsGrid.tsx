import { Skeleton } from "@/components/ui/Skeleton";
import { useTerminalesOverview } from "@/hooks/useTerminalesOverview";
import { useSolicitudesPendientesCount } from "../hooks/useSolicitudesPendientesCount";
import { KpiCard } from "./KpiCard";

export function OpsGrid() {
  const overview = useTerminalesOverview();
  const solicitudes = useSolicitudesPendientesCount();

  const operatividadPct = overview.data ? Math.round((overview.data.enProduccion / (overview.data.total || 1)) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard
        badgeBg="bg-purple-tint"
        badgeColor="text-purple"
        label="En traslado"
        isLoading={overview.isLoading || !overview.data}
        isError={overview.isError}
        value={overview.data?.enTraslado}
        sub="en movimiento"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="13" height="9" rx="2" />
            <path d="M16 10h3l2 3v3h-5z" />
            <circle cx="7.5" cy="18" r="1.6" />
            <circle cx="17.5" cy="18" r="1.6" />
          </svg>
        }
      />
      <KpiCard
        badgeBg="bg-amber-tint"
        badgeColor="text-amber"
        label="Solicitudes pend."
        isLoading={solicitudes.isLoading || solicitudes.data === undefined}
        isError={solicitudes.isError}
        value={solicitudes.data}
        sub={<a href="#">esperan aprobación →</a>}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 13h4.2l1.4 2.4h4.8L15.8 13H20" />
            <path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
            <path d="M4 13v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
          </svg>
        }
      />

      <div className="rounded-[20px] border border-border bg-surface p-[20px_22px]">
        <div className="text-[13px] font-bold text-t2">Operatividad</div>
        {overview.isError ? (
          <div className="mt-1.5 text-sm text-negative">Error</div>
        ) : overview.isLoading || !overview.data ? (
          <Skeleton className="mt-1.5 h-7 w-16" />
        ) : (
          <div className="mt-1.5 font-mono text-2xl font-bold text-accent">{operatividadPct}%</div>
        )}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/50">
          <div className="h-full rounded-full bg-accent" style={{ width: `${operatividadPct}%` }} />
        </div>
        <div className="mt-2 text-[11.5px] text-t3">
          {overview.data ? `${overview.data.enProduccion} de ${overview.data.total} terminales` : "—"}
        </div>
      </div>
    </div>
  );
}
