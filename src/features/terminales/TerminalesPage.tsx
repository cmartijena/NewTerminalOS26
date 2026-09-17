import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Zap, UserCheck, UserX, ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/auth/AuthContext";
import { canModify } from "@/auth/permissions";
import { useVisibleEmpresas as useEmpresas } from "@/auth/useVisibleEmpresas";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useResponsivePageSize } from "@/hooks/useResponsivePageSize";
import { downloadCsv, toCsv } from "@/utils/csv";
import { TerminalesStatRow } from "./components/TerminalesStatRow";
import { TerminalesModelRow } from "./components/TerminalesModelRow";
import { TerminalesFilters, type TerminalesFilterState } from "./components/TerminalesFilters";
import { TerminalesTable } from "./components/TerminalesTable";
import { TerminalFormDialog } from "./components/TerminalFormDialog";
import { AsignarMultipleDialog } from "./components/AsignarMultipleDialog";
import { CambioMasivoDialog } from "./components/CambioMasivoDialog";
import { useTerminales } from "./hooks/useTerminales";
import { useBulkLiberar } from "./hooks/useTerminalMutations";
import { TrasladarTerminalDialog } from "@/features/solicitudes/components/TrasladarTerminalDialog";

// Row/chrome measurements taken from the rendered table (row py-3 + text ≈55px; header
// row + wrapper padding/border + the gap before the pagination bar + its own line height
// + the page's bottom padding ≈132px) — see useResponsivePageSize for how these turn into
// a rows-per-page count.
const ROW_HEIGHT = 55;
const RESERVED_BELOW_TABLE_TOP = 132;

export function TerminalesPage() {
  const [filters, setFilters] = useState<TerminalesFilterState>({
    empresaId: "",
    estado: "",
    modelo: "",
    search: "",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const tableAnchorRef = useRef<HTMLDivElement>(null);
  const pageSize = useResponsivePageSize(tableAnchorRef, ROW_HEIGHT, RESERVED_BELOW_TABLE_TOP);

  const { currentUser } = useAuth();
  const canEdit = canModify(currentUser?.rol);

  const { data: terminales, isLoading, isError } = useTerminales();
  const { data: empresas } = useEmpresas();
  const { data: agencias } = useVisibleAgencias();
  const bulkLiberar = useBulkLiberar();

  const empresasById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e])), [empresas]);
  const agenciasById = useMemo(() => new Map((agencias ?? []).map((a) => [a.id, a])), [agencias]);

  const filtered = useMemo(() => {
    return (terminales ?? []).filter((t) => {
      if (filters.empresaId && t.empresaId !== filters.empresaId) return false;
      if (filters.estado && t.estado !== filters.estado) return false;
      if (filters.modelo && t.modelo?.toUpperCase() !== filters.modelo) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const empresaNombre = t.empresaId ? (empresasById.get(t.empresaId)?.nombre ?? "") : "";
        const haystack = `${t.codigo} ${t.modelo ?? ""} ${empresaNombre} ${t.estado}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [terminales, filters, empresasById]);

  // New filters (or a resize that changes how many rows fit) should land back on page 1
  // rather than risk showing an out-of-range empty page.
  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === paginated.length ? new Set() : new Set(paginated.map((t) => t.id))));
  }

  function handleExportCsv() {
    const csv = toCsv(filtered, [
      { key: "codigo", label: "Código" },
      { key: "modelo", label: "Modelo" },
      { key: "estado", label: "Estado" },
      { key: "sucursal", label: "Sucursal" },
      { key: "empresaId", label: "Empresa ID" },
      { key: "agenciaId", label: "Agencia ID" },
    ]);
    downloadCsv(`terminales_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function handleLiberarMultiple() {
    if (!confirm(`¿Liberar ${selected.size} terminal(es) de su agencia asignada?`)) return;
    bulkLiberar.mutate(Array.from(selected), { onSuccess: () => setSelected(new Set()) });
  }

  const hasSelection = selected.size > 0;
  const selectedTerminales = useMemo(
    () => (terminales ?? []).filter((t) => selected.has(t.id)),
    [terminales, selected],
  );

  return (
    <>
      <PageHeader
        title="Terminales"
        meta={
          <>
            Inventario — <b className="font-mono text-t2">{filtered.length}</b>
            {terminales && filtered.length !== terminales.length && (
              <> de <b className="font-mono text-t2">{terminales.length}</b></>
            )}{" "}
            registros
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download size={14} /> CSV
            </Button>
            {canEdit && (
              <>
                <CambioMasivoDialog
                  terminales={selectedTerminales}
                  onSubmitted={() => setSelected(new Set())}
                  trigger={
                    <Button variant="outline-purple" disabled={!hasSelection}>
                      <Zap size={14} /> Cambio masivo
                    </Button>
                  }
                />
                <AsignarMultipleDialog
                  terminales={selectedTerminales}
                  onSubmitted={() => setSelected(new Set())}
                  trigger={
                    <Button variant="outline-blue" disabled={!hasSelection}>
                      <UserCheck size={14} /> Asignar múltiple
                    </Button>
                  }
                />
                <Button variant="secondary" disabled={!hasSelection} onClick={handleLiberarMultiple}>
                  <UserX size={14} /> Liberar múltiple
                </Button>
              </>
            )}
            {/* Trasladar is a request, not a direct modification — v1 lets every role
                submit one, so it stays available to FRANQUICIADO/TECNICO too. */}
            <TrasladarTerminalDialog
              terminales={selectedTerminales}
              onSubmitted={() => setSelected(new Set())}
              trigger={
                <Button variant="secondary" disabled={!hasSelection}>
                  <ArrowLeftRight size={14} /> Trasladar
                </Button>
              }
            />
            {canEdit && (
              <TerminalFormDialog
                trigger={
                  <Button variant="primary">
                    <Plus size={14} /> Nueva terminal
                  </Button>
                }
              />
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <TerminalesStatRow
          terminales={filtered}
          activeEstado={filters.estado}
          onSelectEstado={(estado) => setFilters({ ...filters, estado })}
        />
        <TerminalesModelRow
          terminales={filtered}
          activeModelo={filters.modelo}
          onSelectModelo={(modelo) => setFilters({ ...filters, modelo })}
        />
        <TerminalesFilters value={filters} onChange={setFilters} />
        <div ref={tableAnchorRef}>
          <TerminalesTable
            terminales={paginated}
            isLoading={isLoading}
            isError={isError}
            empresasById={empresasById}
            agenciasById={agenciasById}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            canEdit={canEdit}
          />
        </div>
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
