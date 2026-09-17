import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/auth/AuthContext";
import { canModify } from "@/auth/permissions";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useTerminales, type TerminalListItem } from "@/features/terminales/hooks/useTerminales";
import { useResponsivePageSize } from "@/hooks/useResponsivePageSize";
import { AgenciasStatRow } from "./components/AgenciasStatRow";
import { AgenciasTable } from "./components/AgenciasTable";
import { AgenciaFormDialog } from "./components/AgenciaFormDialog";
import { SolicitarNuevaAgenciaDialog } from "@/features/solicitudes/components/SolicitarNuevaAgenciaDialog";
import { localNumberFromPos, localNumberValue } from "@/utils/agencia";
import { fechaToSortable } from "@/utils/fecha";
import type { AgenciaEstado } from "@/lib/supabase/types";

// Same measurements as Terminales' table (src/features/terminales/TerminalesPage.tsx) —
// row height and reserved chrome below the table are effectively identical layouts.
const ROW_HEIGHT = 55;
const RESERVED_BELOW_TABLE_TOP = 132;

export function AgenciasPage() {
  const { currentUser } = useAuth();
  const canEdit = canModify(currentUser?.rol);

  const { data: agencias, isLoading, isError } = useVisibleAgencias();
  const { data: empresas } = useVisibleEmpresas();
  const { data: terminales } = useTerminales();
  const [empresaId, setEmpresaId] = useState("");
  const [agenciaId, setAgenciaId] = useState("");
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [fechaTipo, setFechaTipo] = useState<"" | "fecha_inicio" | "fecha_pausa" | "fecha_baja">("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);
  const tableAnchorRef = useRef<HTMLDivElement>(null);
  const pageSize = useResponsivePageSize(tableAnchorRef, ROW_HEIGHT, RESERVED_BELOW_TABLE_TOP);

  const empresasById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e])), [empresas]);
  const empresaNombreById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e.nombre])), [empresas]);

  const terminalesCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of terminales ?? []) {
      if (!t.agenciaId) continue;
      counts.set(t.agenciaId, (counts.get(t.agenciaId) ?? 0) + 1);
    }
    return counts;
  }, [terminales]);

  // Same grouping, but the actual terminales (not just a count) — for the "which
  // terminales does this agencia have" list in AgenciaDetailDialog.
  const terminalesByAgenciaId = useMemo(() => {
    const map = new Map<string, TerminalListItem[]>();
    for (const t of terminales ?? []) {
      if (!t.agenciaId) continue;
      const list = map.get(t.agenciaId);
      if (list) list.push(t);
      else map.set(t.agenciaId, [t]);
    }
    return map;
  }, [terminales]);

  // Agencia options narrow to the selected empresa (cascading, same pattern as
  // TerminalFormDialog's empresa -> agencia selects) — picking an empresa first, then
  // an agencia within it, is faster than scrolling one long alphabetical list of 64.
  const agenciaOptions = useMemo(
    () => (agencias ?? []).filter((a) => !empresaId || a.empresa_id === empresaId),
    [agencias, empresaId],
  );

  const filtered = useMemo(() => {
    return (agencias ?? [])
      .filter((a) => {
        if (agenciaId) return a.id === agenciaId;
        if (empresaId && a.empresa_id !== empresaId) return false;
        if (estado && a.estado !== estado) return false;
        if (search) {
          const q = search.toLowerCase();
          const empresaNombre = a.empresa_id ? (empresaNombreById.get(a.empresa_id) ?? "") : "";
          const localNumber = localNumberFromPos(a.pos) ?? "";
          const haystack = `${a.nombre} ${a.departamento ?? ""} ${a.encargado ?? ""} ${empresaNombre} ${localNumber} ${a.pos ?? ""}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (fechaTipo && (fechaDesde || fechaHasta)) {
          const fechaDia = fechaToSortable(a[fechaTipo]);
          if (!fechaDia) return false;
          if (fechaDesde && fechaDia < fechaDesde) return false;
          if (fechaHasta && fechaDia > fechaHasta) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Empresa → sucursal → N° local (AG01, AG02...) — mirrors v1's renderA() sort
        // (TerminaLV1/index.html ~line 4622-4631).
        const empresaA = a.empresa_id ? (empresaNombreById.get(a.empresa_id) ?? "") : "";
        const empresaB = b.empresa_id ? (empresaNombreById.get(b.empresa_id) ?? "") : "";
        const empresaCmp = empresaA.localeCompare(empresaB, "es");
        if (empresaCmp !== 0) return empresaCmp;
        const sucursalCmp = (a.departamento ?? "").localeCompare(b.departamento ?? "", "es");
        if (sucursalCmp !== 0) return sucursalCmp;
        return localNumberValue(a.pos) - localNumberValue(b.pos);
      });
  }, [agencias, agenciaId, empresaId, estado, search, fechaTipo, fechaDesde, fechaHasta, empresaNombreById]);

  useEffect(() => {
    setPage(1);
  }, [empresaId, agenciaId, estado, search, fechaTipo, fechaDesde, fechaHasta, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  return (
    <>
      <PageHeader
        title="Agencias"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b>
            {agencias && filtered.length !== agencias.length && (
              <> de <b className="font-mono text-t2">{agencias.length}</b></>
            )}{" "}
            agencias
          </>
        }
        actions={
          canEdit ? (
            <AgenciaFormDialog
              trigger={
                <Button variant="primary">
                  <Plus size={14} /> Nueva agencia
                </Button>
              }
            />
          ) : (
            <SolicitarNuevaAgenciaDialog
              trigger={
                <Button variant="primary">
                  <Plus size={14} /> Solicitar nueva agencia
                </Button>
              }
            />
          )
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <AgenciasStatRow
          agencias={filtered as { estado: AgenciaEstado }[]}
          activeEstado={estado}
          onSelectEstado={setEstado}
        />

        <div className="flex flex-wrap gap-2.5">
          <Input
            placeholder="Nombre, N° local, departamento, agente, empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[260px] flex-1"
          />
          <Select
            value={empresaId}
            onChange={(e) => {
              setEmpresaId(e.target.value);
              setAgenciaId("");
            }}
          >
            <option value="">Todas las empresas</option>
            {empresas?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
          <Select value={agenciaId} onChange={(e) => setAgenciaId(e.target.value)}>
            <option value="">Todas las agencias</option>
            {agenciaOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </div>

        {/* Historial: filtra la lista por cuándo cada agencia entró en un estado dado
            (fecha_inicio/fecha_pausa/fecha_baja se autocompletan al cambiar el estado —
            ver estadoFechas.ts). */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={fechaTipo}
            onChange={(e) => setFechaTipo(e.target.value as typeof fechaTipo)}
          >
            <option value="">Historial: sin filtro de fecha</option>
            <option value="fecha_inicio">Fecha inicio</option>
            <option value="fecha_pausa">Fecha pausa</option>
            <option value="fecha_baja">Fecha dada de baja</option>
          </Select>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            disabled={!fechaTipo}
            aria-label="Desde"
          />
          <span className="text-[13px] text-t3">a</span>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            disabled={!fechaTipo}
            aria-label="Hasta"
          />
        </div>

        <div ref={tableAnchorRef}>
          <AgenciasTable
            agencias={paginated}
            isLoading={isLoading}
            isError={isError}
            empresasById={empresasById}
            terminalesCountById={terminalesCountById}
            terminalesByAgenciaId={terminalesByAgenciaId}
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
