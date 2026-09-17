import type { CurrentUser } from "./types";

// Ported from v1's visibleEmpresas()/visibleTerminales()/visibleAgencias()
// (index.html ~line 2855). ADMINISTRADOR/DIRECTIVO/TECNICO see everything; FRANQUICIADO
// is scoped to their assigned empresas (by name, matching v1's own comparison).
export function visibleEmpresaNames(user: CurrentUser | null, allEmpresaNames: string[]): string[] {
  if (!user) return [];
  if (user.rol === "FRANQUICIADO") return user.empresas ?? [];
  return allEmpresaNames;
}

export function isFranquiciado(user: CurrentUser | null): user is CurrentUser & { rol: "FRANQUICIADO" } {
  return user?.rol === "FRANQUICIADO";
}
