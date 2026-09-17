import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { UsuarioSistemaRow } from "@/lib/supabase/types";

// password is deliberately never selected — anon SELECT on that column was revoked once
// login moved to the verify_login() RPC (see AuthContext.tsx), matching the same
// write-only posture already established for agencias/accesos_wam. This row shape omits
// it so nothing in this feature can accidentally assume a real value is available.
export type UsuarioSistemaListRow = Omit<UsuarioSistemaRow, "password">;

async function fetchUsuariosSistema(): Promise<UsuarioSistemaListRow[]> {
  const { data, error } = await supabase
    .from("usuarios_sistema")
    .select("id, nombre, email, usuario, rol, empresas, activo, created_at")
    .order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as UsuarioSistemaListRow[];
}

// ADMINISTRADOR-only page (see Sidebar.tsx's hiddenForRoles, already ported from v1)
// — no role-scoping needed here beyond that page-level gate.
export function useUsuariosSistema() {
  return useQuery({
    queryKey: ["usuarios-sistema"],
    queryFn: fetchUsuariosSistema,
  });
}
