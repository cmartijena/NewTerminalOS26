import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useVisibleEmpresaIds } from "@/auth/useVisibleEmpresaIds";

async function fetchSolicitudesPendientesCount(visibleEmpresaIds: Set<string> | null): Promise<number> {
  // Confirmed against v1's index.html: SOLICITUDES.filter(s => s.estado === 'PENDIENTE')
  // — uppercase, matching the rest of this app's estado values. `solicitudes.empresa_id`
  // is a direct column (unlike terminales), so role scoping is a plain filter here.
  let query = supabase.from("solicitudes").select("id", { count: "exact", head: true }).eq("estado", "PENDIENTE");
  if (visibleEmpresaIds) query = query.in("empresa_id", [...visibleEmpresaIds]);

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function useSolicitudesPendientesCount() {
  const { ids, isLoading: scopeLoading } = useVisibleEmpresaIds();
  return useQuery({
    queryKey: ["dashboard", "solicitudes-pendientes-count", ids ? [...ids].sort() : null],
    queryFn: () => fetchSolicitudesPendientesCount(ids),
    enabled: !scopeLoading,
  });
}
