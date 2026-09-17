// Ported from v1's ROL_DEF / PERMS (index.html ~line 2698) — same 4 roles, same meaning.
export const ROLES = ["ADMINISTRADOR", "DIRECTIVO", "FRANQUICIADO", "TECNICO"] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  DIRECTIVO: "Directivo",
  FRANQUICIADO: "Franquiciado",
  TECNICO: "Técnico",
};

export interface CurrentUser {
  id: string;
  usuario: string;
  nombre: string;
  email: string | null;
  rol: Rol;
  // For FRANQUICIADO: the razon_social names of the empresas this user is scoped to
  // (matches v1's usuarios_sistema.empresas — an array of empresa names, not ids).
  // Ignored for every other role, which sees everything.
  empresas: string[];
}
