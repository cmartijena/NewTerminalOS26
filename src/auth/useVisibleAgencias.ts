import { useAgencias } from "@/hooks/useAgencias";
import { useVisibleEmpresaIds } from "./useVisibleEmpresaIds";

// Same data as useAgencias(), scoped to what the logged-in role is allowed to see —
// ports v1's visibleAgencias() (index.html ~line 2870): ADMINISTRADOR/DIRECTIVO/TECNICO
// see every agencia, FRANQUICIADO only those belonging to their assigned empresas.
export function useVisibleAgencias() {
  const query = useAgencias();
  const { ids } = useVisibleEmpresaIds();
  const data = ids ? query.data?.filter((a) => a.empresa_id && ids.has(a.empresa_id)) : query.data;
  return { ...query, data };
}
