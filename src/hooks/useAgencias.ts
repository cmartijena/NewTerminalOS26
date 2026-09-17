import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { AgenciaRow } from "@/lib/supabase/types";

async function fetchAgencias(): Promise<AgenciaRow[]> {
  // password is included on purpose — see src/lib/supabase/types.ts.
  const { data, error } = await supabase
    .from("agencias")
    .select(
      "id, nombre, empresa_id, departamento, direccion, lat, lng, estado, correo, encargado, celular, pos, foto_url, fecha_inicio, fecha_pausa, fecha_baja, usuario, password, rol",
    )
    .order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as AgenciaRow[];
}

// Shared across screens (Terminales' filters/form, Agencia detail, and later Agencias
// itself).
export function useAgencias() {
  return useQuery({
    queryKey: ["agencias"],
    queryFn: fetchAgencias,
    staleTime: 5 * 60_000,
  });
}
