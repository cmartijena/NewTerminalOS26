import { useAuth } from "./AuthContext";
import { useEmpresas } from "@/hooks/useEmpresas";

interface VisibleEmpresaIds {
  // null = no restriction (sees every empresa). A Set = restricted to those ids.
  ids: Set<string> | null;
  isFranquiciado: boolean;
  isLoading: boolean;
}

// Resolves v1's usuarios_sistema.empresas (an array of empresa NAMES) into the empresa
// IDs the rest of the app actually filters on, once, in one place — see
// src/auth/visibility.ts for the ported v1 rule this implements
// (ADMINISTRADOR/DIRECTIVO/TECNICO see everything, FRANQUICIADO is scoped).
export function useVisibleEmpresaIds(): VisibleEmpresaIds {
  const { currentUser } = useAuth();
  const { data: empresas, isLoading } = useEmpresas();

  const isFranquiciado = currentUser?.rol === "FRANQUICIADO";
  if (!isFranquiciado || !currentUser) {
    return { ids: null, isFranquiciado: false, isLoading: false };
  }

  const allowedNames = new Set(currentUser.empresas);
  const ids = new Set((empresas ?? []).filter((e) => allowedNames.has(e.nombre)).map((e) => e.id));
  return { ids, isFranquiciado: true, isLoading };
}
