import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { estadoParaSupa, type TerminalEstadoDisplay } from "@/lib/supabase/estadoMapping";
import { registrarHistorial, updateTerminalesConHistorial } from "@/lib/supabase/terminalHistorial";
import { useAuth } from "@/auth/AuthContext";

function useInvalidateTerminales() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["terminales"] });
  };
}

export interface TerminalFormValues {
  codigo: string;
  modelo: string;
  estado: TerminalEstadoDisplay; // display value — converted to raw before writing
  agencia_id: string | null;
}

export function useCreateTerminal() {
  const { currentUser } = useAuth();
  const invalidate = useInvalidateTerminales();
  return useMutation({
    mutationFn: async (values: TerminalFormValues) => {
      const { data, error } = await supabase
        .from("terminales")
        .insert({
          codigo: values.codigo,
          modelo: values.modelo,
          estado: estadoParaSupa(values.estado),
          agencia_id: values.agencia_id,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      await registrarHistorial([
        {
          terminalId: data.id,
          agenciaId: values.agencia_id,
          usuarioId: currentUser?.id ?? null,
          estadoAnterior: null,
          estadoNuevo: estadoParaSupa(values.estado),
          agenciaDestinoId: values.agencia_id,
          obs: "Terminal creada",
        },
      ]);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateTerminal() {
  const { currentUser } = useAuth();
  const invalidate = useInvalidateTerminales();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TerminalFormValues }) => {
      await updateTerminalesConHistorial({
        ids: [id],
        patch: {
          codigo: values.codigo,
          modelo: values.modelo,
          estado: estadoParaSupa(values.estado),
          agencia_id: values.agencia_id,
        },
        usuarioId: currentUser?.id ?? null,
        obs: "Cambio manual de estado",
      });
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTerminal() {
  const invalidate = useInvalidateTerminales();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("terminales").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// Bulk actions — "Cambio masivo" (change estado for several), "Liberar múltiple" (clear
// agencia_id for several), and "Asignar múltiple" (used both by AsignarMultipleDialog and
// by AgenciaFormDialog's create-time "Terminales a asignar" picker).
export function useBulkUpdateEstado() {
  const { currentUser } = useAuth();
  const invalidate = useInvalidateTerminales();
  return useMutation({
    mutationFn: async ({ ids, estado }: { ids: string[]; estado: TerminalEstadoDisplay }) => {
      await updateTerminalesConHistorial({
        ids,
        patch: { estado: estadoParaSupa(estado) },
        usuarioId: currentUser?.id ?? null,
        obs: "Cambio masivo",
      });
    },
    onSuccess: invalidate,
  });
}

// Fixed 2026-09-07: was only clearing agencia_id, leaving estado untouched (e.g. still
// EN PRODUCCION with no agencia) — every other "free a terminal" path in this app
// (DADA DE BAJA cascades, TRASLADO_TERMINAL to ALMACEN, useDeleteAgencia) pairs clearing
// the agencia with resetting estado to DISPONIBLE; this one silently didn't.
export function useBulkLiberar() {
  const { currentUser } = useAuth();
  const invalidate = useInvalidateTerminales();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await updateTerminalesConHistorial({
        ids,
        patch: { agencia_id: null, estado: estadoParaSupa("DISPONIBLE") },
        usuarioId: currentUser?.id ?? null,
        obs: "Liberación múltiple",
      });
    },
    onSuccess: invalidate,
  });
}

// Used by AgenciaFormDialog's "Terminales a asignar" picker (create mode) — mirrors v1's
// crearAgencia() terminal-assignment rule (index.html ~line 5472-5473): assigned
// terminales go to EN PRODUCCION only if the new agencia itself is EN PRODUCCION,
// otherwise ASIGNADO.
export function useBulkAsignarAgencia() {
  const { currentUser } = useAuth();
  const invalidate = useInvalidateTerminales();
  return useMutation({
    mutationFn: async ({
      ids,
      agenciaId,
      estado,
      obs,
    }: {
      ids: string[];
      agenciaId: string;
      estado: TerminalEstadoDisplay;
      obs?: string;
    }) => {
      await updateTerminalesConHistorial({
        ids,
        patch: { agencia_id: agenciaId, estado: estadoParaSupa(estado) },
        usuarioId: currentUser?.id ?? null,
        obs: obs ?? "Asignación múltiple",
      });
    },
    onSuccess: invalidate,
  });
}
