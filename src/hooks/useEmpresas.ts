import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { EmpresaRow } from "@/lib/supabase/types";

async function fetchEmpresas(): Promise<EmpresaRow[]> {
  const { data, error } = await supabase
    .from("empresas")
    .select("id, razon_social")
    .eq("activo", true)
    .order("razon_social");
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({ id: e.id, nombre: e.razon_social }));
}

// Shared across screens that need a company lookup (filters, form dropdowns, dashboards)
// — not screen-specific, lives outside features/ on purpose.
export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: fetchEmpresas,
    staleTime: 5 * 60_000,
  });
}
