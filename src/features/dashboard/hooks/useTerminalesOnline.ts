import { useQuery } from "@tanstack/react-query";
import { getTerminalesOnline } from "@/lib/wamApi/endpoints";

export function useTerminalesOnline() {
  return useQuery({
    queryKey: ["dashboard", "wam-online"],
    queryFn: () => getTerminalesOnline(),
    staleTime: 120_000,
  });
}
