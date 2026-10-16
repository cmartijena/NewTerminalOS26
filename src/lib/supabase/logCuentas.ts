import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";

// Account-activity log (who viewed / changed whose password). Two ways rows get in:
// - Verified: the cambiar_password_propia() / admin_ver_password() RPCs insert them
//   server-side after checking the caller's real credentials.
// - Client-reported: an admin resetting someone else's password goes through a plain
//   update, so the app logs it itself with registrarAccionCuenta() — same trust model as
//   every other client-enforced admin action in this app (no Supabase Auth/RLS yet).

export type AccionCuenta = "PASSWORD_CAMBIADA" | "PASSWORD_RESTABLECIDA" | "PASSWORD_VISTA";

export const ACCION_CUENTA_LABEL: Record<AccionCuenta, string> = {
  PASSWORD_CAMBIADA: "Cambió su contraseña",
  PASSWORD_RESTABLECIDA: "Restableció la contraseña",
  PASSWORD_VISTA: "Vio la contraseña",
};

export interface LogCuentaRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_nombre: string;
  actor_rol: string | null;
  accion: AccionCuenta;
  objetivo_id: string | null;
  objetivo_nombre: string | null;
  detalle: string | null;
}

interface RegistrarInput {
  actor: { id: string; nombre: string; rol: string };
  accion: AccionCuenta;
  objetivoId: string | null;
  objetivoNombre: string | null;
  detalle?: string;
}

// Best-effort: failing to write the log must never undo or fail the action that already
// happened — it's reported to the console instead.
export async function registrarAccionCuenta({ actor, accion, objetivoId, objetivoNombre, detalle }: RegistrarInput) {
  const { error } = await supabase.from("log_cuentas").insert({
    actor_id: actor.id,
    actor_nombre: actor.nombre,
    actor_rol: actor.rol,
    accion,
    objetivo_id: objetivoId,
    objetivo_nombre: objetivoNombre,
    detalle: detalle ?? null,
  });
  if (error) console.error("No se pudo registrar en log_cuentas:", error.message);
}

export function useLogCuentas(enabled: boolean) {
  return useQuery({
    queryKey: ["log-cuentas"],
    enabled,
    queryFn: async (): Promise<LogCuentaRow[]> => {
      const { data, error } = await supabase
        .from("log_cuentas")
        .select("id, created_at, actor_id, actor_nombre, actor_rol, accion, objetivo_id, objetivo_nombre, detalle")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as LogCuentaRow[];
    },
  });
}

// Admin-only: returns the target's password, or null if the admin's own credentials are
// wrong. The column itself stays closed to anon — this RPC is the only way to read it,
// and it logs every call.
export async function verPasswordSistema(adminUsuario: string, adminPassword: string, objetivoId: string) {
  const { data, error } = await supabase.rpc("admin_ver_password", {
    p_admin_usuario: adminUsuario,
    p_admin_password: adminPassword,
    p_objetivo_id: objetivoId,
  });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export type ResultadoCambioPassword = "OK" | "ACTUAL_INCORRECTA" | "NUEVA_CORTA" | "NUEVA_IGUAL";

export async function cambiarPasswordPropia(usuario: string, actual: string, nueva: string) {
  const { data, error } = await supabase.rpc("cambiar_password_propia", {
    p_usuario: usuario,
    p_actual: actual,
    p_nueva: nueva,
  });
  if (error) throw new Error(error.message);
  return data as ResultadoCambioPassword;
}
