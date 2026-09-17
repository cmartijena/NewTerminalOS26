import { useQuery } from "@tanstack/react-query";
import { getPorPos } from "@/lib/wamApi/endpoints";

// v1's own date convention (index.html's repCargarWAM): a plain YYYY-MM-DD date range
// widened to full-day boundaries before hitting the API.
export function usePorPos(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["reportes", "wam", "por_pos", desde, hasta],
    queryFn: () => getPorPos({ date_from: `${desde} 00:00:00`, date_to: `${hasta} 23:59:59`, nocache: true }),
    enabled: !!desde && !!hasta,
    staleTime: 60_000,
  });
}
