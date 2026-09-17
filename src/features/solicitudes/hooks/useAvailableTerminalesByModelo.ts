import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapearEstado } from "@/lib/supabase/estadoMapping";

async function fetchAvailableByModelo(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("terminales").select("modelo, estado").is("agencia_id", null);
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const t of data ?? []) {
    const estado = mapearEstado(t.estado);
    if (estado !== "DISPONIBLE" && estado !== "ALMACEN") continue;
    const modelo = t.modelo ?? "";
    counts.set(modelo, (counts.get(modelo) ?? 0) + 1);
  }
  return counts;
}

// Unassigned terminal stock is company-wide inventory, not tied to any one empresa (no
// agencia_id means no agencia join, so there's no empresa to scope by anyway) —
// deliberately NOT role-scoped like useTerminales() (which hides DISPONIBLE/ALMACEN from
// FRANQUICIADO entirely, per v1's visibleTerminales() rule). A franquiciado requesting a
// new agencia with terminales needs to know whether the operator currently has stock of
// a model at all — same information filterCaTerminales() shows any role in v1.
export function useAvailableTerminalesByModelo() {
  return useQuery({
    queryKey: ["terminales", "disponibles-por-modelo"],
    queryFn: fetchAvailableByModelo,
  });
}
