import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { AccesoWamRow } from "@/lib/supabase/types";

async function fetchAccesosWam(): Promise<AccesoWamRow[]> {
  // password IS selected here on purpose — see the note on AccesoWamRow in types.ts.
  const { data, error } = await supabase
    .from("accesos_wam")
    .select("id, cliente, empresa, usuario, correo, password, url_wam, notas, estado, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AccesoWamRow[];
}

// ADMINISTRADOR-only in v1 (index.html's egmIniciarVista()) — callers gate visibility
// themselves (see UsuariosEgmPage), this hook has no role check of its own.
export function useAccesosWam() {
  return useQuery({
    queryKey: ["accesos-wam"],
    queryFn: fetchAccesosWam,
  });
}
