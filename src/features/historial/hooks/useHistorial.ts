import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapearEstado, type TerminalEstadoDisplay } from "@/lib/supabase/estadoMapping";
import { useAgencias } from "@/hooks/useAgencias";
import { useVisibleEmpresaIds } from "@/auth/useVisibleEmpresaIds";

interface HistorialRawRow {
  id: string;
  terminal_id: string;
  agencia_id: string | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  agencia_origen_id: string | null;
  agencia_destino_id: string | null;
  observacion: string | null;
  fecha: string;
}

interface TerminalMini {
  id: string;
  codigo: string;
  modelo: string | null;
}

async function fetchHistorial(): Promise<HistorialRawRow[]> {
  const { data, error } = await supabase
    .from("terminal_historial")
    .select(
      "id, terminal_id, agencia_id, estado_anterior, estado_nuevo, agencia_origen_id, agencia_destino_id, observacion, fecha",
    )
    .order("fecha", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Deliberately unscoped and independent of useTerminales() — a FRANQUICIADO's
// useTerminales() hides every terminal that isn't currently EN PRODUCCION (v1's
// visibleTerminales() rule), which would wrongly blank out history for a terminal that
// has since moved away from them. Codigo/modelo aren't sensitive either way (same
// reasoning as useAvailableTerminalesByModelo).
async function fetchTerminalesMini(): Promise<TerminalMini[]> {
  const { data, error } = await supabase.from("terminales").select("id, codigo, modelo");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface HistorialItem {
  id: string;
  fecha: string;
  terminalCodigo: string;
  terminalModelo: string | null;
  estadoAnterior: TerminalEstadoDisplay | null;
  estadoNuevo: TerminalEstadoDisplay | null;
  agenciaOrigenNombre: string | null;
  agenciaDestinoNombre: string | null;
  empresaId: string | null;
  observacion: string | null;
}

// Real, pre-existing v1 table (index.html's registrarHistorialSupa()) — 189 real rows as
// of 2026-09, last written 2026-08-26. V2 does not yet insert into this table from any of
// its own mutations, so recent V2-driven changes won't show up here until that's wired up
// separately (flagged to the user, not done in this pass).
export function useHistorial() {
  const { ids: visibleEmpresaIds, isLoading: scopeLoading } = useVisibleEmpresaIds();
  const { data: agencias } = useAgencias(); // unscoped — every agencia's id/nombre/empresa_id

  const historialQuery = useQuery({ queryKey: ["historial"], queryFn: fetchHistorial });
  const terminalesQuery = useQuery({
    queryKey: ["historial", "terminales-mini"],
    queryFn: fetchTerminalesMini,
  });

  const data = useMemo(() => {
    if (!historialQuery.data || !terminalesQuery.data) return undefined;
    const terminalById = new Map(terminalesQuery.data.map((t) => [t.id, t]));
    const agenciaById = new Map((agencias ?? []).map((a) => [a.id, a]));

    return historialQuery.data
      .map((h): HistorialItem => {
        const terminal = terminalById.get(h.terminal_id);
        const origen = h.agencia_origen_id ? agenciaById.get(h.agencia_origen_id) : undefined;
        const destino = h.agencia_destino_id ? agenciaById.get(h.agencia_destino_id) : undefined;
        const actual = h.agencia_id ? agenciaById.get(h.agencia_id) : undefined;
        return {
          id: h.id,
          fecha: h.fecha,
          terminalCodigo: terminal?.codigo ?? "(terminal eliminada)",
          terminalModelo: terminal?.modelo ?? null,
          estadoAnterior: h.estado_anterior ? mapearEstado(h.estado_anterior) : null,
          estadoNuevo: h.estado_nuevo ? mapearEstado(h.estado_nuevo) : null,
          agenciaOrigenNombre: origen?.nombre ?? null,
          agenciaDestinoNombre: destino?.nombre ?? null,
          empresaId: destino?.empresa_id ?? origen?.empresa_id ?? actual?.empresa_id ?? null,
          observacion: h.observacion,
        };
      })
      .filter((item) => !visibleEmpresaIds || (item.empresaId && visibleEmpresaIds.has(item.empresaId)));
  }, [historialQuery.data, terminalesQuery.data, agencias, visibleEmpresaIds]);

  return {
    data,
    isLoading: historialQuery.isLoading || terminalesQuery.isLoading || scopeLoading,
    isError: historialQuery.isError || terminalesQuery.isError,
  };
}
