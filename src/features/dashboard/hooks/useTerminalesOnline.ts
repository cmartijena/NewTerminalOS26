import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTerminalesOnline } from "@/lib/wamApi/endpoints";
import type { TerminalesOnlineResponse } from "@/lib/wamApi/types";
import { perteneceAEmpresas, useWamScope } from "@/features/reportes/wam/wamScope";

export function useTerminalesOnline() {
  const { scoped, empresas } = useWamScope();
  const select = useCallback(
    (r: TerminalesOnlineResponse): TerminalesOnlineResponse => {
      if (!scoped) return r;
      const terminales = r.terminales.filter((t) => perteneceAEmpresas(t.pos, empresas));
      return { ...r, terminales, total: terminales.length, online: terminales.filter((t) => t.online).length };
    },
    [scoped, empresas],
  );
  return useQuery({
    queryKey: ["dashboard", "wam-online"],
    queryFn: () => getTerminalesOnline(),
    staleTime: 120_000,
    select,
  });
}
