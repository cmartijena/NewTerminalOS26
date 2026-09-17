import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { AgenciaEstadoPill } from "@/components/domain/AgenciaEstadoPill";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useResponsivePageSize } from "@/hooks/useResponsivePageSize";
import { downloadCsv, toCsv } from "@/utils/csv";
import { useBaseGeneral } from "./hooks/useBaseGeneral";

const ROW_HEIGHT = 55;
const RESERVED_BELOW_TABLE_TOP = 132;

// Read-only consolidated view — mirrors v1's "Base General" (index.html ~line 6491-6530,
// renderBG()): one row per agencia (empresa/sucursal/agencia/estado) plus its terminal
// codes, no create/edit actions. ADMINISTRADOR/DIRECTIVO only — already gated by
// Sidebar.tsx's hiddenForRoles (ported from v1's HIDE map), no extra check needed here.
export function BaseGeneralPage() {
  const { data: rows, isLoading, isError } = useBaseGeneral();
  const { data: empresas } = useVisibleEmpresas();
  const [empresaId, setEmpresaId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const tableAnchorRef = useRef<HTMLDivElement>(null);
  const pageSize = useResponsivePageSize(tableAnchorRef, ROW_HEIGHT, RESERVED_BELOW_TABLE_TOP);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (empresaId && !empresas?.find((e) => e.id === empresaId && e.nombre === r.empresaNombre)) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${r.empresaNombre} ${r.sucursal ?? ""} ${r.agenciaNombre} ${r.posLocal ?? ""} ${r.terminalCodigos.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, empresaId, search, empresas]);

  useEffect(() => {
    setPage(1);
  }, [empresaId, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  function handleExportCsv() {
    const csv = toCsv(
      filtered.map((r) => ({
        idEmp: r.idEmp,
        empresa: r.empresaNombre,
        sucursal: r.sucursal ?? "",
        agencia: r.agenciaNombre,
        pos: r.posLocal ?? "",
        estado: r.estado,
        nTerminales: r.terminalCodigos.length,
        terminales: r.terminalCodigos.join(" | "),
      })),
      [
        { key: "idEmp", label: "ID_EMP" },
        { key: "empresa", label: "EMPRESA" },
        { key: "sucursal", label: "SUCURSAL" },
        { key: "agencia", label: "AGENCIA" },
        { key: "pos", label: "N° LOCAL" },
        { key: "estado", label: "ESTADO" },
        { key: "nTerminales", label: "N° TERMINALES" },
        { key: "terminales", label: "TERMINALES (CÓDIGOS)" },
      ],
    );
    downloadCsv(`base_general_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <>
      <PageHeader
        title="Base General"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b>
            {rows && filtered.length !== rows.length && (
              <> de <b className="font-mono text-t2">{rows.length}</b></>
            )}{" "}
            registro(s)
          </>
        }
        actions={
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download size={14} /> CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <div className="flex flex-wrap gap-2.5">
          <Input
            placeholder="Empresa, sucursal, agencia, N° local, terminal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[260px] flex-1"
          />
          <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div ref={tableAnchorRef}>
          {isError ? (
            <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
              Error al cargar la base general
            </div>
          ) : isLoading ? (
            <div className="space-y-2 rounded-[20px] border border-border bg-surface p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">Sin registros</div>
          ) : (
            <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
              <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr>
                    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">ID</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Sucursal</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Agencia</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">N° local</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Estado</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Terminales</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.agenciaId} className="border-t border-border">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-t3">{r.idEmp}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-t2">{r.empresaNombre}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-t2">{r.sucursal ?? "—"}</td>
                      <td className="px-3 py-3 font-semibold text-t1">{r.agenciaNombre}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-purple">
                        {r.posLocal ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <AgenciaEstadoPill estado={r.estado} />
                      </td>
                      <td className="max-w-[280px] px-3 py-3">
                        {r.terminalCodigos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.terminalCodigos.map((c) => (
                              <span
                                key={c}
                                className="rounded-md bg-bg px-1.5 py-0.5 font-mono text-[10px] text-t2"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-t3">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
