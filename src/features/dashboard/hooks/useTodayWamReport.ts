import { useQuery } from "@tanstack/react-query";
import { getHoy } from "@/lib/wamApi/endpoints";

export function useTodayWamReport() {
  return useQuery({
    queryKey: ["dashboard", "wam-hoy"],
    queryFn: () => getHoy({ grouping: "operator" }),
    // Matches wam_api.py's own ~2min server-side cache TTL for "today" data — no point
    // refetching faster than the backend can actually produce fresh numbers.
    staleTime: 120_000,
  });
}
