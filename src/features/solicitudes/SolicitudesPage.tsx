import { useMemo, useState } from "react";
import { PageHeader } from "@/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/auth/AuthContext";
import { canModify } from "@/auth/permissions";
import { cn } from "@/utils/cn";
import { useSolicitudes } from "./hooks/useSolicitudes";
import { SolicitudCard } from "./components/SolicitudCard";

const FILTERS = ["PENDIENTE", "ACEPTADA", "RECHAZADA", "TODAS"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  PENDIENTE: "🟡 Pendientes",
  ACEPTADA: "✓ Aceptadas",
  RECHAZADA: "✕ Rechazadas",
  TODAS: "Todas",
};

export function SolicitudesPage() {
  const { currentUser } = useAuth();
  const canRespond = canModify(currentUser?.rol);
  const { data: solicitudes, isLoading, isError } = useSolicitudes();
  const [filter, setFilter] = useState<Filter>("PENDIENTE");

  const filtered = useMemo(() => {
    if (filter === "TODAS") return solicitudes ?? [];
    return (solicitudes ?? []).filter((s) => s.estado === filter);
  }, [solicitudes, filter]);

  const pendientesCount = (solicitudes ?? []).filter((s) => s.estado === "PENDIENTE").length;

  return (
    <>
      <PageHeader
        title="Solicitudes"
        meta={
          <>
            <b className="font-mono text-t2">{pendientesCount}</b> pendiente(s)
          </>
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors",
                filter === f
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-t2 hover:border-t3",
              )}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {isError ? (
          <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
            Error al cargar solicitudes
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[20px] border border-border bg-surface p-6 text-center text-sm text-t3">
            Sin solicitudes{filter === "PENDIENTE" ? " pendientes" : ""}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((s) => (
              <SolicitudCard key={s.id} solicitud={s} canRespond={canRespond} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
