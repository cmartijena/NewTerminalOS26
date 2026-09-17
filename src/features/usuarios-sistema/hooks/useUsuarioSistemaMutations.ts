import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { enviarCorreoBienvenida } from "@/lib/emailjs";
import type { Rol } from "@/auth/types";

function useInvalidateUsuariosSistema() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["usuarios-sistema"] });
  };
}

// password is handled separately from the rest of the form now that the column is
// write-only (see UsuariosSistemaListRow) — required at create (a brand-new row has no
// existing password to preserve), optional on update (only sent when actually
// regenerated this session — see useRegenerarPasswordUsuarioSistema below and
// UsuarioSistemaFormDialog's "Regenerar" flow), same split as Agencias'
// AgenciaFormValues/AgenciaCredentials.
export interface UsuarioSistemaFormValues {
  nombre: string;
  email: string;
  usuario: string;
  rol: Rol;
  // Only meaningful for FRANQUICIADO — v1's ROLES_CON_EMPRESAS. Every other role gets an
  // empty array here (they see every empresa regardless).
  empresas: string[];
}

function toRow(values: UsuarioSistemaFormValues) {
  return {
    nombre: values.nombre,
    email: values.email || null,
    usuario: values.usuario,
    rol: values.rol,
    empresas: values.rol === "FRANQUICIADO" ? values.empresas : [],
  };
}

export function useCreateUsuarioSistema() {
  const invalidate = useInvalidateUsuariosSistema();
  return useMutation({
    mutationFn: async (values: UsuarioSistemaFormValues & { password: string }) => {
      const { error } = await supabase
        .from("usuarios_sistema")
        .insert({ ...toRow(values), password: values.password, activo: true });
      if (error) throw new Error(error.message);

      // Mirrors v1's crearUsr() (index.html ~line 6480-6483) — v1's own precedent for
      // this exact email, unlike agencia creation which is a deliberate new V2 behavior.
      if (values.email) {
        try {
          await enviarCorreoBienvenida({
            nombre: values.nombre,
            usuario: values.usuario,
            password: values.password,
            correo: values.email,
          });
        } catch (emailError) {
          console.warn("No se pudo enviar el correo de bienvenida:", emailError);
        }
      }
    },
    onSuccess: invalidate,
  });
}

export function useUpdateUsuarioSistema() {
  const invalidate = useInvalidateUsuariosSistema();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      password,
    }: {
      id: string;
      values: UsuarioSistemaFormValues;
      // Present only when the dialog's "Regenerar contraseña" was used this session —
      // omitted otherwise so an unrelated edit (fixing a name, say) never touches it.
      password?: string;
    }) => {
      const { error } = await supabase
        .from("usuarios_sistema")
        .update({ ...toRow(values), ...(password ? { password } : {}) })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// Table's standalone "Reenviar credenciales" action — rotates the password (the current
// one can never be read back to resend) and writes only that column, without touching
// nombre/email/usuario/rol/empresas. Mirrors useRegenerarPasswordAgencia exactly.
export function useRegenerarPasswordUsuarioSistema() {
  const invalidate = useInvalidateUsuariosSistema();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { error } = await supabase.from("usuarios_sistema").update({ password }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// Self-protection (never lock yourself out) is enforced by the caller — see
// UsuariosSistemaTable.tsx — not here, since this mutation has no notion of "who's
// asking." Mirrors v1's toggleUdbActivo()/delUdbUsr(), which instead hardcoded a
// "can't touch user id 1" rule (fragile — id 1 was just whichever row loaded first, not
// necessarily "the real admin" or "the current viewer").
export function useToggleUsuarioActivo() {
  const invalidate = useInvalidateUsuariosSistema();
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("usuarios_sistema").update({ activo }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteUsuarioSistema() {
  const invalidate = useInvalidateUsuariosSistema();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("usuarios_sistema").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
