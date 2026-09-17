import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapearEstado } from "@/lib/supabase/estadoMapping";
import type { TerminalModelo } from "@/lib/supabase/types";
import { useVisibleEmpresaIds } from "@/auth/useVisibleEmpresaIds";

export interface TerminalesOverview {
  total: number;
  disponibles: number;
  asignadas: number;
  enProduccion: number;
  noDisponible: number;
  enTraslado: number;
  enAlmacen: number;
  agenciasActivas: number;
  modelos: Record<TerminalModelo, number>;
}

const EMPTY_MODELOS: Record<TerminalModelo, number> = {
  TOTEM: 0,
  WALL: 0,
  "SMALL WALL": 0,
  "BOX SIMPLE": 0,
  BOXDUAL: 0,
};

// Ported from v1's renderDash() (index.html ~line 3420) — counts are over the DISPLAY
// estado (after mapearEstado), not the raw DB value. "Agencias activas" counts agencias
// with estado === 'EN PRODUCCION' (agencias.estado has no raw/display split, unlike
// terminales.estado). `visibleEmpresaIds` implements v1's visibleEmpresas()/
// visibleTerminales() role scoping (null = ADMINISTRADOR/DIRECTIVO/TECNICO, unrestricted;
// a Set = FRANQUICIADO, plus — matching v1 exactly — only their EN PRODUCCION terminales).
async function fetchTerminalesOverview(
  visibleEmpresaIds: Set<string> | null,
  isFranquiciado: boolean,
): Promise<TerminalesOverview> {
  const [terminalesRes, agenciasRes] = await Promise.all([
    supabase.from("terminales").select("estado, modelo, agencia_id, agencias(empresa_id)"),
    supabase.from("agencias").select("id, estado, empresa_id"),
  ]);

  if (terminalesRes.error) throw new Error(terminalesRes.error.message);
  if (agenciasRes.error) throw new Error(agenciasRes.error.message);

  type TerminalRow = {
    estado: string;
    modelo: string | null;
    agencia_id: string | null;
    agencias: { empresa_id: string | null } | { empresa_id: string | null }[] | null;
  };
  const rawTerminales = (terminalesRes.data ?? []) as TerminalRow[];
  const agencias = (agenciasRes.data ?? []) as { id: string; estado: string; empresa_id: string | null }[];

  const terminales = rawTerminales
    .map((t) => {
      const agencia = Array.isArray(t.agencias) ? t.agencias[0] : t.agencias;
      return { estado: t.estado, modelo: t.modelo, empresaId: agencia?.empresa_id ?? null };
    })
    .filter((t) => !visibleEmpresaIds || (t.empresaId && visibleEmpresaIds.has(t.empresaId)));

  const visibleAgencias = agencias.filter(
    (a) => !visibleEmpresaIds || (a.empresa_id && visibleEmpresaIds.has(a.empresa_id)),
  );

  const modelos = { ...EMPTY_MODELOS };
  let disponibles = 0;
  let asignadas = 0;
  let enProduccion = 0;
  let noDisponible = 0;
  let enTraslado = 0;
  let enAlmacen = 0;

  for (const t of terminales) {
    const display = mapearEstado(t.estado);
    // Matches v1 exactly: a franquiciado only sees their EN PRODUCCION terminales, full
    // stop — every other estado is invisible to that role, not just uncounted.
    if (isFranquiciado && display !== "EN PRODUCCION") continue;

    if (t.modelo && t.modelo.toUpperCase() in modelos) {
      modelos[t.modelo.toUpperCase() as TerminalModelo] += 1;
    }
    switch (display) {
      case "DISPONIBLE":
        disponibles += 1;
        break;
      case "ASIGNADO":
        asignadas += 1;
        break;
      case "EN PRODUCCION":
        enProduccion += 1;
        break;
      case "NO DISPONIBLE":
        noDisponible += 1;
        break;
      case "EN TRASLADO":
        enTraslado += 1;
        break;
      case "ALMACEN":
        enAlmacen += 1;
        break;
    }
  }

  const total = isFranquiciado ? enProduccion : terminales.length;
  const agenciasActivas = visibleAgencias.filter((a) => a.estado === "EN PRODUCCION").length;

  return {
    total,
    disponibles,
    asignadas,
    enProduccion,
    noDisponible,
    enTraslado,
    enAlmacen,
    agenciasActivas,
    modelos,
  };
}

// Shared by Dashboard and Terminales — both show the same counts, scoped to whatever the
// logged-in user is allowed to see.
export function useTerminalesOverview() {
  const { ids, isFranquiciado, isLoading: scopeLoading } = useVisibleEmpresaIds();
  return useQuery({
    queryKey: ["terminales", "overview", isFranquiciado, ids ? [...ids].sort() : null],
    queryFn: () => fetchTerminalesOverview(ids, isFranquiciado),
    enabled: !scopeLoading,
  });
}
