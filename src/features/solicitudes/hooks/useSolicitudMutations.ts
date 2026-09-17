import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { estadoParaSupa } from "@/lib/supabase/estadoMapping";
import { estadoFechaPatch } from "@/features/agencias/estadoFechas";
import { useAuth } from "@/auth/AuthContext";
import { updateTerminalesConHistorial } from "@/lib/supabase/terminalHistorial";
import { generatePassword, generateUsuario } from "@/utils/credentials";
import type {
  EstadoAgenciaData,
  NuevaAgenciaData,
  SolicitudRow,
  SolicitudTipo,
  TrasladoTerminalData,
} from "@/lib/supabase/types";

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["solicitudes"] });
    queryClient.invalidateQueries({ queryKey: ["terminales"] });
    queryClient.invalidateQueries({ queryKey: ["agencias"] });
  };
}

export interface CreateSolicitudInput {
  tipo: SolicitudTipo;
  mensaje: string;
  empresa_id: string | null;
  data: TrasladoTerminalData | EstadoAgenciaData | NuevaAgenciaData;
}

export function useCreateSolicitud() {
  const { currentUser } = useAuth();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: CreateSolicitudInput) => {
      const { error } = await supabase.from("solicitudes").insert({
        tipo: input.tipo,
        mensaje: input.mensaje,
        empresa_id: input.empresa_id,
        data: input.data,
        solicitado_por: currentUser?.nombre ?? "Desconocido",
        solicitado_por_rol: currentUser?.rol ?? "DESCONOCIDO",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// Approving executes the request's real side effect immediately (no v1-style
// "EN TRASLADO then confirm arrival" two-step — see project memory for why that's a
// deliberate simplification, not a missed detail).
export function useResponderSolicitud() {
  const { currentUser } = useAuth();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ solicitud, aceptar }: { solicitud: SolicitudRow; aceptar: boolean }) => {
      if (aceptar) {
        if (solicitud.tipo === "TRASLADO_TERMINAL") {
          const payload = solicitud.data as TrasladoTerminalData;
          if (payload.destino === "ALMACEN") {
            await updateTerminalesConHistorial({
              ids: payload.terminal_ids,
              patch: { agencia_id: null, estado: estadoParaSupa("ALMACEN") },
              usuarioId: currentUser?.id ?? null,
              agenciaDestinoId: null,
              obs: "Traslado aprobado → Almacén",
            });
          } else {
            const agenciaId = payload.agencia_destino_id;
            if (!agenciaId) throw new Error("Solicitud sin agencia destino");
            const { data: agencia, error: agError } = await supabase
              .from("agencias")
              .select("estado")
              .eq("id", agenciaId)
              .single();
            if (agError) throw new Error(agError.message);
            const nuevoEstado = agencia.estado === "EN PRODUCCION" ? "EN PRODUCCION" : "ASIGNADO";
            await updateTerminalesConHistorial({
              ids: payload.terminal_ids,
              patch: { agencia_id: agenciaId, estado: estadoParaSupa(nuevoEstado) },
              usuarioId: currentUser?.id ?? null,
              obs: "Traslado aprobado a otra agencia",
            });
          }
        } else if (solicitud.tipo === "ESTADO_AGENCIA") {
          const payload = solicitud.data as EstadoAgenciaData;
          const { error } = await supabase
            .from("agencias")
            .update({ estado: payload.nuevo_estado, ...estadoFechaPatch(payload.nuevo_estado) })
            .eq("id", payload.agencia_id);
          if (error) throw new Error(error.message);

          // Mirrors v1's ejecutarBajaAgenciaSolicitud()/ejecutarEstadoAgenciaSolicitud()
          // (index.html ~line 2815-2828): a baja frees the agencia's terminales, an
          // activation flips them all to EN PRODUCCION.
          if (payload.nuevo_estado === "DADA DE BAJA") {
            const { data: attached, error: findError } = await supabase
              .from("terminales")
              .select("id")
              .eq("agencia_id", payload.agencia_id);
            if (findError) throw new Error(findError.message);
            await updateTerminalesConHistorial({
              ids: (attached ?? []).map((t) => t.id),
              patch: { agencia_id: null, estado: estadoParaSupa("DISPONIBLE") },
              usuarioId: currentUser?.id ?? null,
              agenciaDestinoId: null,
              obs: "Agencia dada de baja (solicitud aprobada)",
            });
          } else if (payload.nuevo_estado === "EN PRODUCCION") {
            const { data: attached, error: findError } = await supabase
              .from("terminales")
              .select("id")
              .eq("agencia_id", payload.agencia_id);
            if (findError) throw new Error(findError.message);
            await updateTerminalesConHistorial({
              ids: (attached ?? []).map((t) => t.id),
              patch: { estado: estadoParaSupa("EN PRODUCCION") },
              usuarioId: currentUser?.id ?? null,
              obs: "Agencia activada (solicitud aprobada)",
            });
          }
        } else if (solicitud.tipo === "NUEVA_AGENCIA") {
          const payload = solicitud.data as NuevaAgenciaData;

          const { data: empresa, error: empError } = await supabase
            .from("empresas")
            .select("razon_social")
            .eq("id", payload.empresa_id)
            .single();
          if (empError) throw new Error(empError.message);

          // Same POS correlativo rule as AgenciaFormDialog's direct-create flow
          // (updIdSub()-equivalent) — count existing agencias for this empresa+sucursal.
          const { count, error: countError } = await supabase
            .from("agencias")
            .select("id", { count: "exact", head: true })
            .eq("empresa_id", payload.empresa_id)
            .eq("departamento", payload.departamento);
          if (countError) throw new Error(countError.message);
          const correlativo = String((count ?? 0) + 1).padStart(2, "0");
          const pos = `${empresa.razon_social} ${payload.departamento} - AG${correlativo} - ${payload.nombre}`;

          const { error } = await supabase.from("agencias").insert({
            nombre: payload.nombre,
            empresa_id: payload.empresa_id,
            departamento: payload.departamento,
            direccion: payload.direccion,
            encargado: payload.encargado,
            celular: payload.celular,
            pos,
            estado: "PENDIENTE",
            lat: payload.lat,
            lng: payload.lng,
            activo: true,
            usuario: generateUsuario(empresa.razon_social, payload.departamento, payload.nombre),
            password: generatePassword(),
          });
          if (error) throw new Error(error.message);
        }
      }

      const { error } = await supabase
        .from("solicitudes")
        .update({
          estado: aceptar ? "ACEPTADA" : "RECHAZADA",
          respondido_por: currentUser?.nombre ?? "Desconocido",
          respondido_at: new Date().toISOString(),
        })
        .eq("id", solicitud.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
