import { useQuery } from "@tanstack/react-query";
import { getPorJuego } from "@/lib/wamApi/endpoints";

export function usePorJuego(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["reportes", "wam", "por_juego", desde, hasta],
    queryFn: () => getPorJuego({ date_from: `${desde} 00:00:00`, date_to: `${hasta} 23:59:59`, nocache: true }),
    enabled: !!desde && !!hasta,
    staleTime: 60_000,
  });
}
