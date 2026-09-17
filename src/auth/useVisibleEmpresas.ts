import { useEmpresas } from "@/hooks/useEmpresas";
import { useVisibleEmpresaIds } from "./useVisibleEmpresaIds";

// Same data as useEmpresas(), scoped to what the logged-in role is allowed to see —
// use this (not the raw useEmpresas()) anywhere the UI lists companies for a user to pick
// from (filters, form dropdowns), so a FRANQUICIADO never even sees another company's
// name as an option.
export function useVisibleEmpresas() {
  const query = useEmpresas();
  const { ids } = useVisibleEmpresaIds();
  const data = ids ? query.data?.filter((e) => ids.has(e.id)) : query.data;
  return { ...query, data };
}
