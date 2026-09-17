import { useQuery } from "@tanstack/react-query";
import { getReporteOperador } from "@/lib/wamApi/endpoints";

export function useReporteOperador(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["reportes", "wam", "operador", desde, hasta],
    queryFn: () => getReporteOperador({ date_from: `${desde} 00:00:00`, date_to: `${hasta} 23:59:59`, nocache: true }),
    enabled: !!desde && !!hasta,
    staleTime: 60_000,
  });
}
