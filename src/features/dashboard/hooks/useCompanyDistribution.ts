import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useVisibleEmpresaIds } from "@/auth/useVisibleEmpresaIds";

export interface CompanyDistributionEntry {
  empresaId: string;
  nombre: string;
  terminales: number;
  pct: number;
}

// terminales has no empresa_id column — empresa is derived via
// terminal.agencia_id -> agencias.empresa_id, matching v1's own client-side join
// (index.html ~line 2455: `.select('*, agencias(nombre, departamento, empresa_id)')`).
// `visibleEmpresaIds` implements v1's visibleEmpresas() role scoping — a franquiciado
// should never see another company's row here, let alone its terminal count.
async function fetchCompanyDistribution(
  visibleEmpresaIds: Set<string> | null,
): Promise<CompanyDistributionEntry[]> {
  const [empresasRes, agenciasRes, terminalesRes] = await Promise.all([
    supabase.from("empresas").select("id, razon_social").eq("activo", true),
    supabase.from("agencias").select("id, empresa_id"),
    supabase.from("terminales").select("agencia_id"),
  ]);

  if (empresasRes.error) throw new Error(empresasRes.error.message);
  if (agenciasRes.error) throw new Error(agenciasRes.error.message);
  if (terminalesRes.error) throw new Error(terminalesRes.error.message);

  const empresasAll = (empresasRes.data ?? []) as { id: string; razon_social: string }[];
  const empresas = visibleEmpresaIds ? empresasAll.filter((e) => visibleEmpresaIds.has(e.id)) : empresasAll;
  const agencias = (agenciasRes.data ?? []) as { id: string; empresa_id: string | null }[];
  const terminales = (terminalesRes.data ?? []) as { agencia_id: string | null }[];

  const empresaByAgencia = new Map(agencias.map((a) => [a.id, a.empresa_id]));
  const counts = new Map<string, number>();
  let visibleTotal = 0;
  for (const t of terminales) {
    if (!t.agencia_id) continue;
    const empresaId = empresaByAgencia.get(t.agencia_id);
    if (!empresaId) continue;
    if (visibleEmpresaIds && !visibleEmpresaIds.has(empresaId)) continue;
    counts.set(empresaId, (counts.get(empresaId) ?? 0) + 1);
    visibleTotal += 1;
  }
  const total = visibleTotal || 1;

  return empresas
    .map((e) => {
      const n = counts.get(e.id) ?? 0;
      return { empresaId: e.id, nombre: e.razon_social, terminales: n, pct: Math.round((n / total) * 100) };
    })
    .sort((a, b) => b.terminales - a.terminales);
}

export function useCompanyDistribution() {
  const { ids, isLoading: scopeLoading } = useVisibleEmpresaIds();
  return useQuery({
    queryKey: ["dashboard", "company-distribution", ids ? [...ids].sort() : null],
    queryFn: () => fetchCompanyDistribution(ids),
    enabled: !scopeLoading,
  });
}
