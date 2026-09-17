import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/layout/PageHeader";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useHistorial } from "./hooks/useHistorial";
import { HistorialCard } from "./components/HistorialCard";

const PAGE_SIZE = 20;

type Tipo = "" | "traslado" | "estado";

export function HistorialPage() {
  const { data: historial, isLoading, isError } = useHistorial();
  const { data: empresas } = useVisibleEmpresas();

  const [search, setSearch] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [tipo, setTipo] = useState<Tipo>("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return (historial ?? []).filter((h) => {
      if (empresaId && h.empresaId !== empresaId) return false;
      if (tipo === "traslado" && !(h.agenciaOrigenNombre || h.agenciaDestinoNombre)) return false;
      if (tipo === "estado" && (h.agenciaOrigenNombre || h.agenciaDestinoNombre)) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${h.terminalCodigo} ${h.terminalModelo ?? ""} ${h.observacion ?? ""} ${h.agenciaOrigenNombre ?? ""} ${h.agenciaDestinoNombre ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (desde || hasta) {
        const dia = h.fecha.slice(0, 10);
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
      }
      return true;
    });
  }, [historial, empresaId, tipo, search, desde, hasta]);

  useEffect(() => {
    setPage(1);
  }, [empresaId, tipo, search, desde, hasta]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  return (
    <>
      <PageHeader
        title="Historial"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b>
            {historial && filtered.length !== historial.length && (
              <> de <b className="font-mono text-t2">{historial.length}</b></>
            )}{" "}
            movimiento(s)
          </>
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <div className="flex flex-wrap gap-2.5">
          <Input
            placeholder="Buscar por terminal, agencia, observación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[260px] flex-1"
          />
          <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre}
              </option>
            ))}
          </Select>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
            <option value="">Todos los movimientos</option>
            <option value="traslado">Traslados</option>
            <option value="estado">Cambios de estado</option>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[12px] font-semibold text-t3">Fecha</span>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
          <span className="text-[13px] text-t3">a</span>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
        </div>

        {isError ? (
          <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
            Error al cargar historial
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="rounded-[20px] border border-border bg-surface p-6 text-center text-sm text-t3">
            Sin movimientos
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {paginated.map((h) => (
              <HistorialCard key={h.id} item={h} />
            ))}
          </div>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
