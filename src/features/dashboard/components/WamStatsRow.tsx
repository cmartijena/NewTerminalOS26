import { useMemo } from "react";
import { useTodayWamReport } from "../hooks/useTodayWamReport";
import { useTerminalesOnline } from "../hooks/useTerminalesOnline";
import { formatCurrency } from "@/utils/formatters";
import { KpiCard } from "./KpiCard";

// "Encendidas" breaks down into 3 real states the WAM API already reports per terminal
// (status "active"/"idle" = online, per wam_api.py's own terminales_online() docstring;
// anything else — "off"/"offline"/empty — is apagada) instead of the old on/off binary.
function useEncendidasBreakdown() {
  const online = useTerminalesOnline();
  return useMemo(() => {
    if (!online.data) return null;
    let activas = 0;
    let inactivas = 0;
    for (const t of online.data.terminales) {
      if (t.status === "active") activas++;
      else if (t.status === "idle") inactivas++;
    }
    const total = online.data.total;
    const apagadas = total - activas - inactivas;
    return { activas, inactivas, apagadas, total };
  }, [online.data]);
}

export function WamStatsRow() {
  const money = useTodayWamReport();
  const online = useTerminalesOnline();
  const breakdown = useEncendidasBreakdown();

  const paidTickets = money.data?.filas[0]?.["Paid tickets"];
  const paidTicketsNum = typeof paidTickets === "string" ? Number(paidTickets) : undefined;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        className="lg:col-span-2"
        badgeBg="bg-positive-tint"
        badgeColor="text-positive"
        label="Encendidas · WAM"
        isLoading={online.isLoading || !breakdown}
        isError={online.isError}
        value={breakdown ? `${online.data!.online} / ${breakdown.total}` : undefined}
        sub="clic → ver en lista"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
          </svg>
        }
        extra={
          breakdown && (
            <>
              <div className="mt-1.5 flex h-[6px] overflow-hidden rounded-full">
                <div className="bg-positive" style={{ width: `${(breakdown.activas / breakdown.total) * 100}%` }} />
                <div className="bg-amber" style={{ width: `${(breakdown.inactivas / breakdown.total) * 100}%` }} />
                <div className="bg-muted-slice" style={{ width: `${(breakdown.apagadas / breakdown.total) * 100}%` }} />
              </div>
              <div className="mt-1 flex gap-2.5 text-[10px] text-t3">
                <span>{breakdown.activas} activas</span>
                <span>{breakdown.inactivas} inactivas</span>
                <span>{breakdown.apagadas} apagadas</span>
              </div>
            </>
          )
        }
      />
      <KpiCard
        badgeBg="bg-positive-tint"
        badgeColor="text-positive"
        label="Money In"
        isLoading={money.isLoading || !money.data}
        isError={money.isError}
        value={money.data ? formatCurrency(money.data.total_in) : undefined}
        valueColor="text-positive"
        sub="ingresos · hoy"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        }
      />
      <KpiCard
        badgeBg="bg-negative-tint"
        badgeColor="text-negative"
        label="Money Out"
        isLoading={money.isLoading || !money.data}
        isError={money.isError}
        value={money.data ? formatCurrency(money.data.total_out) : undefined}
        valueColor="text-negative"
        sub="pagado · hoy"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        }
      />
      <KpiCard
        badgeBg="bg-accent-tint"
        badgeColor="text-accent"
        label="Balance"
        isLoading={money.isLoading || !money.data}
        isError={money.isError}
        value={money.data ? formatCurrency(money.data.balance) : undefined}
        sub="neto · hoy"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        }
      />
      <KpiCard
        badgeBg="bg-blue-tint"
        badgeColor="text-blue"
        label="Tickets"
        isLoading={money.isLoading || !money.data}
        isError={money.isError}
        value={paidTicketsNum ?? "—"}
        valueColor="text-blue"
        sub="pagados · hoy"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="8" rx="2" />
          </svg>
        }
      />
    </div>
  );
}
