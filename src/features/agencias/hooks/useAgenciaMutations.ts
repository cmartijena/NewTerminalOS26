import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { estadoParaSupa } from "@/lib/supabase/estadoMapping";
import { estadoFechaPatch } from "../estadoFechas";
import { sortableToFechaInicio, sortableToIso } from "@/utils/fecha";
import { enviarCorreoBienvenida } from "@/lib/emailjs";
import { useAuth } from "@/auth/AuthContext";
import { updateTerminalesConHistorial } from "@/lib/supabase/terminalHistorial";
import type { AgenciaEstado } from "@/lib/supabase/types";

// Shared by every "free/activate this agencia's terminales" cascade below (useUpdateAgencia,
// useToggleAgenciaActivo, useDeleteAgencia) — fetches the agencia's currently-attached
// terminal ids first so updateTerminalesConHistorial has something to log against.
async function idsDeTerminalesDeAgencia(agenciaId: string): Promise<string[]> {
  const { data, error } = await supabase.from("terminales").select("id").eq("agencia_id", agenciaId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => t.id);
}

function useInvalidateAgencias() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["agencias"] });
  };
}

export interface AgenciaFormValues {
  nombre: string;
  empresa_id: string;
  departamento: string;
  direccion: string;
  encargado: string;
  celular: string;
  correo: string;
  pos: string;
  estado: AgenciaEstado;
  lat: number | null;
  lng: number | null;
  // Native <input type="date"> values (YYYY-MM-DD, "" if unset) — manual overrides for
  // the same 3 fields estadoFechaPatch auto-stamps on an estado transition. See
  // useUpdateAgencia: a real transition this save still wins over a manual edit to the
  // one field it stamps, but otherwise these are taken as-is.
  fecha_inicio: string;
  fecha_pausa: string;
  fecha_baja: string;
}

function toRow(values: AgenciaFormValues) {
  return {
    nombre: values.nombre,
    empresa_id: values.empresa_id,
    departamento: values.departamento || null,
    direccion: values.direccion || null,
    encargado: values.encargado || null,
    celular: values.celular || null,
    correo: values.correo || null,
    pos: values.pos || null,
    estado: values.estado,
    lat: values.lat,
    lng: values.lng,
    fecha_inicio: sortableToFechaInicio(values.fecha_inicio),
    fecha_pausa: sortableToIso(values.fecha_pausa),
    fecha_baja: sortableToIso(values.fecha_baja),
  };
}

// WAM access credentials for create — usuario/password are both readable back now (see
// AgenciaRow), grouped here since they're only ever set together at creation. Editing an
// existing agencia's usuario/rol/password instead goes through the separate
// `credentials` param on useUpdateAgencia below (Usuarios EGM module).
export interface AgenciaCredentials {
  usuario: string;
  password: string;
}

export function useCreateAgencia() {
  const invalidate = useInvalidateAgencias();
  return useMutation({
    mutationFn: async (values: AgenciaFormValues & AgenciaCredentials): Promise<string> => {
      const { usuario, password, ...rest } = values;
      // `activo` is NOT NULL with no DB default (same gotcha as `empresas.activo` —
      // see useEmpresaMutations.ts) — must be set explicitly on insert.
      // `.select("id").single()` so the caller can upload a photo right after (v1 does
      // the same two-step: create the row, then upload using its real id as the
      // filename — index.html ~line 5502-5505).
      const { data, error } = await supabase
        .from("agencias")
        .insert({ ...toRow(rest), ...estadoFechaPatch(rest.estado), activo: true, usuario, password })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      // New V2 behavior, not ported from v1 (v1 only ever sent this welcome email for
      // Usuarios Sistema) — user asked that a new agencia's EGM usuario/password get
      // emailed to it the moment they're issued. Best-effort: never fail the whole
      // creation over an email hiccup (missing EmailJS config, bad correo, etc.) — the
      // agencia is already created either way.
      if (rest.correo) {
        try {
          await enviarCorreoBienvenida({
            nombre: rest.encargado || rest.nombre,
            usuario,
            password,
            correo: rest.correo,
          });
        } catch (emailError) {
          console.warn("No se pudo enviar el correo de bienvenida:", emailError);
        }
      }

      return data.id;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateAgencia() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      estadoAnterior,
      credentials,
    }: {
      id: string;
      values: AgenciaFormValues;
      estadoAnterior: AgenciaEstado;
      // Usuarios EGM module: usuario/rol are freely editable (both readable, see
      // AgenciaRow); password is optional and, when present, is a brand-new plaintext
      // value the caller just generated client-side (never a read-back of the old one —
      // that's still impossible by design) to overwrite it with.
      credentials?: { usuario: string; rol: string; password?: string };
    }) => {
      // Only auto-stamp when this save is the actual transition into the new estado —
      // otherwise every save of an already-EN PRODUCCION agencia would silently overwrite
      // a manually-edited fecha_inicio/fecha_pausa/fecha_baja with "now". toRow(values)
      // already carries whatever the form's 3 date fields say (manual edits included);
      // the transition-triggered stamp only wins for the one field it targets.
      const fechaPatch = values.estado !== estadoAnterior ? estadoFechaPatch(values.estado) : {};
      const credentialsPatch = credentials
        ? { usuario: credentials.usuario, rol: credentials.rol, ...(credentials.password ? { password: credentials.password } : {}) }
        : {};
      const { error } = await supabase
        .from("agencias")
        .update({ ...toRow(values), ...fechaPatch, ...credentialsPatch })
        .eq("id", id);
      if (error) throw new Error(error.message);

      // Same cascade useResponderSolicitud() already applies when an ESTADO_AGENCIA
      // solicitud is approved (mirrors v1's ejecutarEstadoAgenciaSolicitud()/
      // ejecutarBajaAgenciaSolicitud()) — now also applied here so a direct edit by
      // ADMINISTRADOR/DIRECTIVO has the same real-world effect as the same estado change
      // arriving through a solicitud: DADA DE BAJA frees the agencia's terminales back to
      // DISPONIBLE, EN PRODUCCION brings all of them online. Gated on a real transition
      // for the same reason as fechaPatch above — otherwise an unrelated edit (e.g. just
      // fixing the celular) to an already-EN PRODUCCION agencia would force every one of
      // its terminales back to EN PRODUCCION even if one had since been set to, say, EN
      // REPARACION for an unrelated reason.
      if (values.estado === estadoAnterior) {
        // no-op — nothing below applies when estado hasn't actually changed
      } else if (values.estado === "DADA DE BAJA") {
        await updateTerminalesConHistorial({
          ids: await idsDeTerminalesDeAgencia(id),
          patch: { agencia_id: null, estado: estadoParaSupa("DISPONIBLE") },
          usuarioId: currentUser?.id ?? null,
          agenciaDestinoId: null,
          obs: "Agencia dada de baja",
        });
      } else if (values.estado === "EN PRODUCCION") {
        await updateTerminalesConHistorial({
          ids: await idsDeTerminalesDeAgencia(id),
          patch: { estado: estadoParaSupa("EN PRODUCCION") },
          usuarioId: currentUser?.id ?? null,
          obs: "Agencia puesta en producción",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencias"] });
      queryClient.invalidateQueries({ queryKey: ["terminales"] });
    },
  });
}

// Separate from useUpdateAgencia because it's called at a different point in the create
// flow (after the row already exists, once a photo — if any — finished uploading) and
// because AgenciaFormDialog's edit path also uses it standalone when only the photo
// changed, without re-sending every other field.
export function useSetAgenciaFoto() {
  const invalidate = useInvalidateAgencias();
  return useMutation({
    mutationFn: async ({ id, fotoUrl }: { id: string; fotoUrl: string | null }) => {
      const { error } = await supabase.from("agencias").update({ foto_url: fotoUrl }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// Mirrors v1's toggleActivo() (index.html ~line 5810): the Usuarios EGM list's
// Activar/Desactivar action, which is really just a shortcut for the agencia's own estado
// — deactivating sends it to DADA DE BAJA (freeing its terminales, same as everywhere
// else that transition happens), reactivating sends it to PENDIENTE (matching v1 exactly
// — not straight to EN PRODUCCION, since a reactivated agencia should be reviewed first).
export function useToggleAgenciaActivo() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, activar }: { id: string; activar: boolean }) => {
      const nuevoEstado: AgenciaEstado = activar ? "PENDIENTE" : "DADA DE BAJA";
      const { error } = await supabase
        .from("agencias")
        .update({ estado: nuevoEstado, ...estadoFechaPatch(nuevoEstado) })
        .eq("id", id);
      if (error) throw new Error(error.message);

      if (nuevoEstado === "DADA DE BAJA") {
        await updateTerminalesConHistorial({
          ids: await idsDeTerminalesDeAgencia(id),
          patch: { agencia_id: null, estado: estadoParaSupa("DISPONIBLE") },
          usuarioId: currentUser?.id ?? null,
          agenciaDestinoId: null,
          obs: "Agencia desactivada (Usuarios EGM)",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencias"] });
      queryClient.invalidateQueries({ queryKey: ["terminales"] });
    },
  });
}

// Usuarios EGM's "Reenviar credenciales" action. password is readable now (see
// AgenciaRow), but this still issues a brand-new one rather than resending the existing
// value — a deliberate choice (not a technical necessity anymore): "reenviar" doubles as
// a rotate-and-notify, consistent with how it worked before password became readable.
// Revisit if the user asks for a plain resend of the current password instead. Separate
// from useUpdateAgencia because this needs none of the rest of the form.
export function useRegenerarPasswordAgencia() {
  const invalidate = useInvalidateAgencias();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { error } = await supabase.from("agencias").update({ password }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// Mirrors v1's eliminarAg() (index.html ~line 5790): free any terminales assigned to
// this agencia (agencia_id -> null, estado -> DISPONIBLE) *before* the hard delete, so
// nothing is left pointing at a row that no longer exists.
export function useDeleteAgencia() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await updateTerminalesConHistorial({
        ids: await idsDeTerminalesDeAgencia(id),
        patch: { agencia_id: null, estado: estadoParaSupa("DISPONIBLE") },
        usuarioId: currentUser?.id ?? null,
        agenciaDestinoId: null,
        obs: "Agencia eliminada",
      });

      const { error } = await supabase.from("agencias").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencias"] });
      queryClient.invalidateQueries({ queryKey: ["terminales"] });
    },
  });
}
