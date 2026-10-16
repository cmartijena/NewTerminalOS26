import { useQuery } from "@tanstack/react-query";
import { getPorJuego } from "@/lib/wamApi/endpoints";
import { useWamScope } from "./wamScope";

export function usePorJuego(desde: string, hasta: string) {
  const { scoped } = useWamScope();
  return useQuery({
    queryKey: ["reportes", "wam", "por_juego", desde, hasta],
    queryFn: () => getPorJuego({ date_from: `${desde} 00:00:00`, date_to: `${hasta} 23:59:59`, nocache: true }),
    // por_juego has no empresa field, so a scoped user can't be given a cut of it — the
    // game rankings are hidden for them rather than showing the whole operator's games.
    enabled: !!desde && !!hasta && !scoped,
    staleTime: 60_000,
  });
}
