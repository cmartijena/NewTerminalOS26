import { useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { PorPosFila, ReporteOperadorResponse } from "@/lib/wamApi/types";
import { empresaFromPos } from "./terminalesActividad";

// WAM's API has no notion of which TerminalOS empresas a user may see — every endpoint
// returns the whole operator. FRANQUICIADO is scoped to their assigned empresas
// everywhere else in the app (visibility.ts), so the WAM numbers are cut down to those
// empresas here, in the hooks, so every screen that reads them is covered at once.
// This is client-side scoping, same trust model as the rest of the app: wam-api itself
// still answers any caller holding its (public) secret.

export function useWamScope() {
  const { currentUser } = useAuth();
  return useMemo(
    () => ({ scoped: currentUser?.rol === "FRANQUICIADO", empresas: currentUser?.empresas ?? [] }),
    [currentUser],
  );
}

// WAM names POS "EMPRESA - AGxx- LOCAL" and the empresa spelling drifts from ours
// ("APUESTA DEP.LA 12" vs "APUESTAS DEP. LA 12") — empresaFromPos already handles that.
export function perteneceAEmpresas(texto: string, empresas: string[]): boolean {
  return empresaFromPos(texto, empresas) !== "Otros";
}

export function filtrarPorEmpresas(filas: PorPosFila[], empresas: string[]): PorPosFila[] {
  return filas.filter((f) => perteneceAEmpresas(f.empresa || f.POS, empresas));
}

// Money in/out/balance for a scoped user. WAM only reports these per operator, never per
// empresa, so they're summed from the already-filtered per-POS rows — the same rows the
// Dinero table shows, so the cards always agree with it. (Paid tickets has no per-POS
// equivalent: `filas` stays empty so every consumer renders "—" for it.)
export function totalesDesdePorPos(
  filas: PorPosFila[],
  fechaFrom: string,
  fechaTo: string,
): ReporteOperadorResponse & { hora_peru: string } {
  const totalIn = filas.reduce((s, f) => s + (Number(f._cash_in) || 0), 0);
  const totalOut = filas.reduce((s, f) => s + (Number(f._ticket_out) || 0), 0);
  return {
    fecha_from: fechaFrom,
    fecha_to: fechaTo,
    filas: [],
    headers: [],
    total_in: totalIn,
    total_out: totalOut,
    balance: totalIn - totalOut,
    registros: filas.length,
    actualizado: "",
    hora_peru: "",
  };
}
