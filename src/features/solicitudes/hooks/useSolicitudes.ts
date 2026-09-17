import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { SolicitudRow } from "@/lib/supabase/types";
import { useVisibleEmpresaIds } from "@/auth/useVisibleEmpresaIds";

async function fetchSolicitudes(visibleEmpresaIds: Set<string> | null): Promise<SolicitudRow[]> {
  let query = supabase.from("solicitudes").select("*").order("created_at", { ascending: false });
  if (visibleEmpresaIds) query = query.in("empresa_id", [...visibleEmpresaIds]);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SolicitudRow[];
}

// Same role-scoping as useTerminales/useVisibleAgencias — a FRANQUICIADO only sees
// solicitudes for their own empresa(s); every other role sees everything (TECNICO
// included, matching v1's own lack of per-user filtering on this list).
export function useSolicitudes() {
  const { ids, isLoading: scopeLoading } = useVisibleEmpresaIds();
  return useQuery({
    queryKey: ["solicitudes", ids ? [...ids].sort() : null],
    queryFn: () => fetchSolicitudes(ids),
    enabled: !scopeLoading,
  });
}
