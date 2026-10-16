import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReporteOperador } from "@/lib/wamApi/endpoints";
import type { ReporteOperadorResponse } from "@/lib/wamApi/types";
import { fetchPorPos, porPosKey } from "./usePorPos";
import { filtrarPorEmpresas, totalesDesdePorPos, useWamScope } from "./wamScope";

export function useReporteOperador(desde: string, hasta: string) {
  const { scoped, empresas } = useWamScope();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["reportes", "wam", scoped ? "operador-scoped" : "operador", desde, hasta, ...(scoped ? [empresas.join("|")] : [])],
    queryFn: async (): Promise<ReporteOperadorResponse> => {
      if (!scoped) {
        return getReporteOperador({ date_from: `${desde} 00:00:00`, date_to: `${hasta} 23:59:59`, nocache: true });
      }
      // WAM only reports these totals per operator, so a scoped user's are summed from
      // their empresas' POS rows. fetchQuery shares the por_pos cache entry the Dinero
      // table already uses — no second (slow) backend call.
      const raw = await qc.fetchQuery({
        queryKey: porPosKey(desde, hasta),
        queryFn: () => fetchPorPos(desde, hasta),
        staleTime: 60_000,
      });
      return totalesDesdePorPos(filtrarPorEmpresas(raw.filas, empresas), raw.fecha_from, raw.fecha_to);
    },
    enabled: !!desde && !!hasta,
    staleTime: 60_000,
  });
}
