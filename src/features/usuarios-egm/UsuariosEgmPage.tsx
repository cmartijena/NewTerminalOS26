import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/layout/PageHeader";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/auth/AuthContext";
import { canModify } from "@/auth/permissions";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useResponsivePageSize } from "@/hooks/useResponsivePageSize";
import { localNumberFromPos, localNumberValue } from "@/utils/agencia";
import { UsuariosEgmTable } from "./components/UsuariosEgmTable";
import { AccesosWamSection } from "./components/AccesosWamSection";

const ROW_HEIGHT = 55;
const RESERVED_BELOW_TABLE_TOP = 132;

// One row per agencia with WAM/EGM credentials — mirrors v1's DB.usuarios, which is
// itself just every agencia that has a `usuario` set (index.html ~line 2438-2451), not a
// separate table. See useAgenciaMutations.ts / AgenciaFormDialog's "Acceso EGM" section
// for how usuario/rol/password get edited — password is readable (per-row reveal toggle
// in UsuariosEgmTable) since 2026-09-05, on explicit user request.
export function UsuariosEgmPage() {
  const { currentUser } = useAuth();
  const canEdit = canModify(currentUser?.rol);
  // Stricter than canEdit — v1's "Accesos WAM Personalizados" sub-section is
  // ADMINISTRADOR-only, not ADMINISTRADOR+DIRECTIVO (egmIniciarVista()).
  const isAdmin = currentUser?.rol === "ADMINISTRADOR";

  const { data: agencias, isLoading, isError } = useVisibleAgencias();
  const { data: empresas } = useVisibleEmpresas();
  const [empresaId, setEmpresaId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const tableAnchorRef = useRef<HTMLDivElement>(null);
  const pageSize = useResponsivePageSize(tableAnchorRef, ROW_HEIGHT, RESERVED_BELOW_TABLE_TOP);

  const empresasById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e])), [empresas]);
  const empresaNombreById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e.nombre])), [empresas]);

  const withUsuario = useMemo(() => (agencias ?? []).filter((a) => a.usuario), [agencias]);

  const filtered = useMemo(() => {
    return withUsuario
      .filter((a) => {
        if (empresaId && a.empresa_id !== empresaId) return false;
        if (search) {
          const q = search.toLowerCase();
          const empresaNombre = a.empresa_id ? (empresaNombreById.get(a.empresa_id) ?? "") : "";
          const localNumber = localNumberFromPos(a.pos) ?? "";
          const haystack = `${a.nombre} ${a.departamento ?? ""} ${a.usuario ?? ""} ${empresaNombre} ${localNumber}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Empresa → sucursal → N° local — same order as Agencias/Terminales
        // (AgenciasPage.tsx, mirrors v1's renderA() sort).
        const empresaA = a.empresa_id ? (empresaNombreById.get(a.empresa_id) ?? "") : "";
        const empresaB = b.empresa_id ? (empresaNombreById.get(b.empresa_id) ?? "") : "";
        const empresaCmp = empresaA.localeCompare(empresaB, "es");
        if (empresaCmp !== 0) return empresaCmp;
        const sucursalCmp = (a.departamento ?? "").localeCompare(b.departamento ?? "", "es");
        if (sucursalCmp !== 0) return sucursalCmp;
        return localNumberValue(a.pos) - localNumberValue(b.pos);
      });
  }, [withUsuario, empresaId, search, empresaNombreById]);

  useEffect(() => {
    setPage(1);
  }, [empresaId, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  return (
    <>
      <PageHeader
        title="Usuarios EGM"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b>
            {withUsuario.length !== filtered.length && (
              <> de <b className="font-mono text-t2">{withUsuario.length}</b></>
            )}{" "}
            usuario(s)
          </>
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <div className="flex flex-wrap gap-2.5">
          <Input
            placeholder="Nombre, usuario, sucursal, empresa..."
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
          <UsuariosEgmTable
            agencias={paginated}
            isLoading={isLoading}
            isError={isError}
            empresasById={empresasById}
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

        {isAdmin && <AccesosWamSection />}
      </div>
    </>
  );
}
