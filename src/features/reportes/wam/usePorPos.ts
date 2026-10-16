import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPorPos } from "@/lib/wamApi/endpoints";
import type { PorPosResponse } from "@/lib/wamApi/types";
import { filtrarPorEmpresas, useWamScope } from "./wamScope";

// v1's own date convention (index.html's repCargarWAM): a plain YYYY-MM-DD date range
// widened to full-day boundaries before hitting the API.
export const porPosKey = (desde: string, hasta: string) => ["reportes", "wam", "por_pos", desde, hasta] as const;
export const fetchPorPos = (desde: string, hasta: string) =>
  getPorPos({ date_from: `${desde} 00:00:00`, date_to: `${hasta} 23:59:59`, nocache: true });

export function usePorPos(desde: string, hasta: string) {
  const { scoped, empresas } = useWamScope();
  // The cache holds the full operator response; each consumer cuts it down to the user's
  // empresas with `select`, so scoped and unscoped users never share a filtered cache.
  const select = useCallback(
    (r: PorPosResponse): PorPosResponse => (scoped ? { ...r, filas: filtrarPorEmpresas(r.filas, empresas) } : r),
    [scoped, empresas],
  );
  return useQuery({
    queryKey: porPosKey(desde, hasta),
    queryFn: () => fetchPorPos(desde, hasta),
    enabled: !!desde && !!hasta,
    staleTime: 60_000,
    select,
  });
}
