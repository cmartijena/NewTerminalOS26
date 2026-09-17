import { Skeleton } from "@/components/ui/Skeleton";
import { useTerminalesOverview } from "@/hooks/useTerminalesOverview";

interface StatDef {
  label: string;
  sub: string;
  value: (o: NonNullable<ReturnType<typeof useTerminalesOverview>["data"]>) => number;
  badgeBg: string;
  badgeColor: string;
  icon: React.ReactNode;
}

const STATS: StatDef[] = [
  {
    label: "Total terminales",
    sub: "en el sistema",
    value: (o) => o.total,
    badgeBg: "bg-accent-tint",
    badgeColor: "text-accent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    ),
  },
  {
    label: "Disponibles",
    sub: "para asignar",
    value: (o) => o.disponibles,
    badgeBg: "bg-blue-tint",
    badgeColor: "text-blue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Asignadas",
    sub: "con agencia",
    value: (o) => o.asignadas,
    badgeBg: "bg-blue-tint",
    badgeColor: "text-blue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 1 0 5 9.5C5 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.3" />
      </svg>
    ),
  },
  {
    label: "En producción",
    sub: "operativas",
    value: (o) => o.enProduccion,
    badgeBg: "bg-accent-tint",
    badgeColor: "text-accent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 15l6-6" />
        <circle cx="9.5" cy="9.5" r="0.6" />
        <circle cx="14.5" cy="14.5" r="0.6" />
      </svg>
    ),
  },
  {
    label: "No disponibles",
    sub: "atención",
    value: (o) => o.noDisponible,
    badgeBg: "bg-negative-tint",
    badgeColor: "text-negative",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
  },
  {
    label: "Agencias activas",
    sub: "en producción",
    value: (o) => o.agenciasActivas,
    badgeBg: "bg-amber-tint",
    badgeColor: "text-amber",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 1 0 5 9.5C5 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.3" />
      </svg>
    ),
  },
];

export function StatRow() {
  const { data, isLoading, isError } = useTerminalesOverview();

  return (
    <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-3 lg:grid-cols-6">
      {STATS.map((stat) => (
        <div key={stat.label} className="rounded-[20px] border border-border bg-surface p-4">
          <div
            className={`mb-[10px] flex h-8 w-8 items-center justify-center rounded-[10px] ${stat.badgeBg} ${stat.badgeColor} [&_svg]:h-[18px] [&_svg]:w-[18px]`}
          >
            {stat.icon}
          </div>
          <div className="text-[11px] font-bold text-t2">{stat.label}</div>
          {isError ? (
            <div className="mt-1 text-xs text-negative">Error</div>
          ) : isLoading || !data ? (
            <Skeleton className="mt-1 h-5 w-10" />
          ) : (
            <div className="mt-1 font-mono text-[21px] font-bold text-t1">{stat.value(data)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
