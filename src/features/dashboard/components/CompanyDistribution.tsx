import { Skeleton } from "@/components/ui/Skeleton";
import { useCompanyDistribution } from "../hooks/useCompanyDistribution";
import { useTerminalesOverview } from "@/hooks/useTerminalesOverview";

const SLICE_COLORS = [
  "var(--accent-strong)",
  "var(--amber)",
  "var(--purple)",
  "var(--blue)",
  "var(--negative)",
  "var(--muted-slice)",
];

export function CompanyDistribution() {
  const { data, isLoading, isError } = useCompanyDistribution();
  const overview = useTerminalesOverview();

  let gradient = "var(--muted-slice)";
  if (data && data.length > 0) {
    let cursor = 0;
    const stops: string[] = [];
    data.forEach((entry, i) => {
      const color = SLICE_COLORS[i % SLICE_COLORS.length];
      const next = cursor + entry.pct;
      stops.push(`${color} ${cursor}% ${next}%`);
      cursor = next;
    });
    if (cursor < 100) stops.push(`var(--muted-slice) ${cursor}% 100%`);
    gradient = stops.join(", ");
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-[20px] border border-border bg-surface p-[22px_24px_24px] sm:flex-row">
      <div className="relative h-[132px] w-[132px] flex-none">
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-surface">
          <div className="font-mono text-[22px] font-bold text-t1">{overview.data?.total ?? "—"}</div>
          <div className="text-[9.5px] uppercase tracking-wide text-t3">Total</div>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1">
        <div className="text-[13px] font-bold text-t2">Distribución por empresa</div>
        {isError ? (
          <div className="mt-3 text-sm text-negative">Error al cargar</div>
        ) : isLoading || !data ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : data.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3.5">
            {data.map((entry, i) => (
              <div key={entry.empresaId}>
                <div className="mb-1.5 flex items-center gap-2 text-[13px]">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="flex-1 font-semibold text-t1">{entry.nombre}</span>
                  <span className="font-mono text-t2">
                    {entry.terminales} ({entry.pct}%)
                  </span>
                </div>
                <div className="ml-4 h-[7px] overflow-hidden rounded-full bg-border/50">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${entry.pct}%`, background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-t3">Sin datos</div>
        )}
      </div>
    </div>
  );
}
