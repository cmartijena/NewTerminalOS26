import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { localNumberFromPos } from "@/utils/agencia";
import type { AgenciaEstado } from "@/lib/supabase/types";

interface TerminalMini {
  id: string;
  codigo: string;
  agencia_id: string | null;
}

// Deliberately unscoped, like useHistorial's terminal lookup — v1's Base General
// (renderBG(), index.html ~line 6491-6530) lists every terminal tied to the agencia
// (`DB.terminales.filter(t=>t.id_sub===a.id_sub)`) with no estado filtering, not through
// visibleTerminales()'s FRANQUICIADO-hides-non-EN-PRODUCCION rule — a consolidated
// inventory view should show what's actually assigned, not hide it based on that quirk.
async function fetchTerminalesMini(): Promise<TerminalMini[]> {
  const { data, error } = await supabase.from("terminales").select("id, codigo, agencia_id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface BaseGeneralRow {
  agenciaId: string;
  idEmp: string; // v1's e.id — a purely positional display index (client-assigned, "001", "002"...), not a real column
  empresaNombre: string;
  sucursal: string | null;
  agenciaNombre: string;
  posLocal: string | null;
  estado: AgenciaEstado;
  terminalCodigos: string[];
}

export function useBaseGeneral() {
  const { data: empresas, isLoading: empresasLoading } = useEmpresas(); // unscoped — full list, for idEmp numbering
  const { data: agencias, isLoading: agenciasLoading, isError: agenciasError } = useVisibleAgencias();
  const terminalesQuery = useQuery({ queryKey: ["base-general", "terminales-mini"], queryFn: fetchTerminalesMini });

  const idEmpByEmpresaId = useMemo(() => {
    const map = new Map<string, string>();
    (empresas ?? []).forEach((e, i) => map.set(e.id, String(i + 1).padStart(3, "0")));
    return map;
  }, [empresas]);

  const empresaNombreById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e.nombre])), [empresas]);

  const terminalesByAgenciaId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const t of terminalesQuery.data ?? []) {
      if (!t.agencia_id) continue;
      const list = map.get(t.agencia_id);
      if (list) list.push(t.codigo);
      else map.set(t.agencia_id, [t.codigo]);
    }
    return map;
  }, [terminalesQuery.data]);

  const rows = useMemo((): BaseGeneralRow[] | undefined => {
    if (!agencias) return undefined;
    return agencias.map((a) => ({
      agenciaId: a.id,
      idEmp: (a.empresa_id && idEmpByEmpresaId.get(a.empresa_id)) || "—",
      empresaNombre: (a.empresa_id && empresaNombreById.get(a.empresa_id)) || "—",
      sucursal: a.departamento,
      agenciaNombre: a.nombre,
      posLocal: localNumberFromPos(a.pos),
      estado: a.estado,
      terminalCodigos: (terminalesByAgenciaId.get(a.id) ?? []).sort(),
    }));
  }, [agencias, idEmpByEmpresaId, empresaNombreById, terminalesByAgenciaId]);

  return {
    data: rows,
    isLoading: empresasLoading || agenciasLoading || terminalesQuery.isLoading,
    isError: agenciasError || terminalesQuery.isError,
  };
}
