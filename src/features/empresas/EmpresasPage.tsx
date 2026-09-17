import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/auth/AuthContext";
import { canModify } from "@/auth/permissions";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useTerminales } from "@/features/terminales/hooks/useTerminales";
import { EmpresaCard } from "./components/EmpresaCard";
import { EmpresaFormDialog } from "./components/EmpresaFormDialog";

export function EmpresasPage() {
  const { currentUser } = useAuth();
  const canEdit = canModify(currentUser?.rol);

  const { data: empresas, isLoading, isError } = useVisibleEmpresas();
  const { data: agencias } = useVisibleAgencias();
  const { data: terminales } = useTerminales();
  const [search, setSearch] = useState("");

  const terminalesCountByEmpresa = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of terminales ?? []) {
      if (!t.empresaId) continue;
      counts.set(t.empresaId, (counts.get(t.empresaId) ?? 0) + 1);
    }
    return counts;
  }, [terminales]);

  const agenciasStatsByEmpresa = useMemo(() => {
    const stats = new Map<string, { total: number; enProduccion: number }>();
    for (const a of agencias ?? []) {
      if (!a.empresa_id) continue;
      const current = stats.get(a.empresa_id) ?? { total: 0, enProduccion: 0 };
      current.total += 1;
      if (a.estado === "EN PRODUCCION") current.enProduccion += 1;
      stats.set(a.empresa_id, current);
    }
    return stats;
  }, [agencias]);

  const filtered = useMemo(() => {
    const list = empresas ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [empresas, search]);

  return (
    <>
      <PageHeader
        title="Empresas"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b> empresas
          </>
        }
        actions={
          canEdit && (
            <EmpresaFormDialog
              trigger={
                <Button variant="primary">
                  <Plus size={14} /> Nueva empresa
                </Button>
              }
            />
          )
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <Input
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm"
        />

        {isError ? (
          <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
            Error al cargar empresas
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
            Sin empresas
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((empresa) => {
              const agStats = agenciasStatsByEmpresa.get(empresa.id) ?? { total: 0, enProduccion: 0 };
              return (
                <EmpresaCard
                  key={empresa.id}
                  empresa={empresa}
                  terminalesCount={terminalesCountByEmpresa.get(empresa.id) ?? 0}
                  agenciasCount={agStats.total}
                  enProduccionCount={agStats.enProduccion}
                  canEdit={canEdit}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
