import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getHoy } from "@/lib/wamApi/endpoints";
import type { HoyResponse } from "@/lib/wamApi/types";
import { todayIso } from "@/features/reportes/wam/peruDate";
import { fetchPorPos, porPosKey } from "@/features/reportes/wam/usePorPos";
import { filtrarPorEmpresas, totalesDesdePorPos, useWamScope } from "@/features/reportes/wam/wamScope";

export function useTodayWamReport() {
  const { scoped, empresas } = useWamScope();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["dashboard", scoped ? "wam-hoy-scoped" : "wam-hoy", ...(scoped ? [empresas.join("|")] : [])],
    queryFn: async (): Promise<HoyResponse> => {
      if (!scoped) return getHoy({ grouping: "operator" });
      // Same reasoning as useReporteOperador: WAM's "today" totals are per operator only,
      // so a scoped user's are summed from their empresas' POS rows for today.
      const dia = todayIso();
      const raw = await qc.fetchQuery({
        queryKey: porPosKey(dia, dia),
        queryFn: () => fetchPorPos(dia, dia),
        staleTime: 60_000,
      });
      return totalesDesdePorPos(filtrarPorEmpresas(raw.filas, empresas), raw.fecha_from, raw.fecha_to);
    },
    // Matches wam_api.py's own ~2min server-side cache TTL for "today" data — no point
    // refetching faster than the backend can actually produce fresh numbers.
    staleTime: 120_000,
  });
}
