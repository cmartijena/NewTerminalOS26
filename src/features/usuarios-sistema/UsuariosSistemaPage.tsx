import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { useResponsivePageSize } from "@/hooks/useResponsivePageSize";
import { ROLES, ROL_LABEL } from "@/auth/types";
import { cn } from "@/utils/cn";
import { useUsuariosSistema } from "./hooks/useUsuariosSistema";
import { UsuariosSistemaTable } from "./components/UsuariosSistemaTable";
import { UsuarioSistemaFormDialog } from "./components/UsuarioSistemaFormDialog";

const ROW_HEIGHT = 55;
const RESERVED_BELOW_TABLE_TOP = 132;

const ROL_FILTERS = ["TODOS", ...ROLES] as const;
type RolFilter = (typeof ROL_FILTERS)[number];

// ADMINISTRADOR-only (Sidebar.tsx's hiddenForRoles already gates this, ported from v1's
// applyRoleRestrictions() HIDE map) — the app's own login accounts. Real, pre-existing
// table `usuarios_sistema`. password was readable here until the verify_login() RPC
// fix (2026-09-14) closed it, matching agencias/accesos_wam's write-only posture —
// AuthContext.tsx's login() now goes through that RPC instead of a direct column read.
export function UsuariosSistemaPage() {
  const { data: usuarios, isLoading, isError } = useUsuariosSistema();
  const [rolFilter, setRolFilter] = useState<RolFilter>("TODOS");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const tableAnchorRef = useRef<HTMLDivElement>(null);
  const pageSize = useResponsivePageSize(tableAnchorRef, ROW_HEIGHT, RESERVED_BELOW_TABLE_TOP);

  const filtered = useMemo(() => {
    return (usuarios ?? []).filter((u) => {
      if (rolFilter !== "TODOS" && u.rol !== rolFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${u.usuario} ${u.nombre} ${u.email ?? ""} ${u.rol}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [usuarios, rolFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [rolFilter, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  return (
    <>
      <PageHeader
        title="Usuarios Sistema"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b>
            {usuarios && filtered.length !== usuarios.length && (
              <> de <b className="font-mono text-t2">{usuarios.length}</b></>
            )}{" "}
            usuario(s)
          </>
        }
        actions={
          <UsuarioSistemaFormDialog
            otros={usuarios ?? []}
            trigger={
              <Button variant="primary">
                <Plus size={14} /> Nuevo usuario
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <div className="flex flex-wrap gap-2">
          {ROL_FILTERS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRolFilter(r)}
              className={cn(
                "rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors",
                rolFilter === r
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-t2 hover:border-t3",
              )}
            >
              {r === "TODOS" ? "Todos" : ROL_LABEL[r]}
            </button>
          ))}
        </div>

        <Input
          placeholder="Usuario, nombre, correo, rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[420px]"
        />

        <div ref={tableAnchorRef}>
          <UsuariosSistemaTable
            usuarios={paginated}
            allUsuarios={usuarios ?? []}
            isLoading={isLoading}
            isError={isError}
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
