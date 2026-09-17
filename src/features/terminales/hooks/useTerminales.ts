import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapearEstado, type TerminalEstadoDisplay } from "@/lib/supabase/estadoMapping";
import { useVisibleEmpresaIds } from "@/auth/useVisibleEmpresaIds";

export interface TerminalListItem {
  id: string;
  codigo: string;
  modelo: string | null;
  estadoRaw: string;
  estado: TerminalEstadoDisplay;
  agenciaId: string | null;
  agenciaNombre: string | null;
  sucursal: string | null;
  empresaId: string | null;
}

// Same embedded-resource join v1 uses (index.html ~line 2455): terminales has no
// empresa_id/sucursal of its own — both come through the linked agencia.
// `visibleEmpresaIds`/`isFranquiciado` implement v1's visibleTerminales() role scoping —
// see useTerminalesOverview.ts for the same rule applied to the Dashboard's counts.
async function fetchTerminales(
  visibleEmpresaIds: Set<string> | null,
  isFranquiciado: boolean,
): Promise<TerminalListItem[]> {
  const { data, error } = await supabase
    .from("terminales")
    .select("id, codigo, modelo, estado, agencia_id, agencias(nombre, departamento, empresa_id)")
    .order("codigo");
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((t) => {
      const agencia = Array.isArray(t.agencias) ? t.agencias[0] : t.agencias;
      return {
        id: t.id,
        codigo: t.codigo,
        modelo: t.modelo,
        estadoRaw: t.estado,
        estado: mapearEstado(t.estado),
        agenciaId: t.agencia_id,
        agenciaNombre: agencia?.nombre ?? null,
        sucursal: agencia?.departamento ?? null,
        empresaId: agencia?.empresa_id ?? null,
      };
    })
    .filter((t) => !visibleEmpresaIds || (t.empresaId && visibleEmpresaIds.has(t.empresaId)))
    .filter((t) => !isFranquiciado || t.estado === "EN PRODUCCION");
}

export function useTerminales() {
  const { ids, isFranquiciado, isLoading: scopeLoading } = useVisibleEmpresaIds();
  return useQuery({
    queryKey: ["terminales", "list", isFranquiciado, ids ? [...ids].sort() : null],
    queryFn: () => fetchTerminales(ids, isFranquiciado),
    enabled: !scopeLoading,
  });
}
