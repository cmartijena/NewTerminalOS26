import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { AgenciasMap } from "@/components/map/AgenciasMap";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useTerminales } from "@/features/terminales/hooks/useTerminales";
import { cn } from "@/utils/cn";
import { localNumberFromPos } from "@/utils/agencia";

const ESTADO_DOT: Record<string, string> = {
  "EN PRODUCCION": "bg-positive",
  PENDIENTE: "bg-amber",
  INACTIVA: "bg-t3",
  "DADA DE BAJA": "bg-negative",
};

export function MapaPage() {
  const { data: agencias, isLoading, isError } = useVisibleAgencias();
  const { data: empresas } = useVisibleEmpresas();
  const { data: terminales } = useTerminales();
  const [search, setSearch] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [searchParams] = useSearchParams();
  // Deep-link from Terminales' "ir al mapa" action: /mapa?agenciaId=... preselects
  // that agencia and scrolls it into view in the list once it's loaded.
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("agenciaId"));
  const pendingScrollId = useRef(selectedId);

  const empresaNombreById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e.nombre])), [empresas]);

  const terminalesCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of terminales ?? []) {
      if (!t.agenciaId) continue;
      counts.set(t.agenciaId, (counts.get(t.agenciaId) ?? 0) + 1);
    }
    return counts;
  }, [terminales]);

  const filtered = useMemo(() => {
    let list = agencias ?? [];
    if (empresaId) list = list.filter((a) => a.empresa_id === empresaId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => `${a.nombre} ${a.departamento ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [agencias, empresaId, search]);

  useEffect(() => {
    if (!pendingScrollId.current) return;
    if (!filtered.some((a) => a.id === pendingScrollId.current)) return;
    document.getElementById(`ag-row-${pendingScrollId.current}`)?.scrollIntoView({ block: "center" });
    pendingScrollId.current = null;
  }, [filtered]);

  // Only worth showing when there's more than one company to pick from — a
  // FRANQUICIADO scoped to a single empresa doesn't need it, an ADMINISTRADOR/
  // DIRECTIVO/TECNICO seeing every company does.
  const showEmpresaFilter = (empresas?.length ?? 0) > 1;

  return (
    <>
      <PageHeader
        title="Mapa"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b> agencias visibles
          </>
        }
      />

      <div className="flex flex-col gap-4 p-[26px_38px_38px] lg:flex-row">
        <Card className="flex w-full flex-col lg:w-[340px] lg:flex-none">
          <div className="flex flex-col gap-2 border-b border-border p-3">
            <Input
              placeholder="Buscar agencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
            {showEmpresaFilter && (
              <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full">
                <option value="">Todas las empresas</option>
                {empresas?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="max-h-[560px] flex-1 overflow-y-auto lg:max-h-[600px]">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="p-4 text-sm text-negative">Error al cargar agencias</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-t3">Sin agencias</div>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.id}
                  id={`ag-row-${a.id}`}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-bg",
                    selectedId === a.id && "bg-accent-tint",
                  )}
                >
                  {a.foto_url ? (
                    <img
                      src={a.foto_url}
                      alt=""
                      className="h-10 w-10 flex-none rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-muted-slice text-[13px] font-bold text-t3">
                      {a.nombre[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-1.5 w-1.5 flex-none rounded-full", ESTADO_DOT[a.estado] ?? "bg-t3")} />
                      <span className="truncate text-[13.5px] font-semibold text-t1">{a.nombre}</span>
                    </div>
                    <div className="flex items-center justify-between pl-3.5">
                      <span className="truncate text-[11.5px] text-t3">
                        {showEmpresaFilter && a.empresa_id ? `${empresaNombreById.get(a.empresa_id) ?? ""} — ` : ""}
                        {a.departamento ?? "—"}
                      </span>
                      <span className="flex-none font-mono text-[11.5px] text-t2">
                        {terminalesCountById.get(a.id) ?? 0} term.
                      </span>
                    </div>
                    {(a.encargado || localNumberFromPos(a.pos)) && (
                      <div className="flex items-center justify-between pl-3.5">
                        <span className="truncate text-[11px] text-t3">{a.encargado ?? "—"}</span>
                        {localNumberFromPos(a.pos) && (
                          <span className="flex-none font-mono text-[11px] text-t3">
                            {localNumberFromPos(a.pos)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="h-[420px] flex-1 overflow-hidden p-0 lg:h-[640px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-sm text-negative">
              Error al cargar agencias
            </div>
          ) : (
            <AgenciasMap
              agencias={filtered}
              selectedId={selectedId}
              onSelect={(a) => setSelectedId(a.id)}
              terminalesCountById={terminalesCountById}
            />
          )}
        </Card>
      </div>
    </>
  );
}
