import type { Rol } from "./types";

// Only ADMINISTRADOR and DIRECTIVO can create/edit/delete/bulk-modify terminales,
// agencias, etc. FRANQUICIADO and TECNICO are view-only — they can see data and (once
// the Solicitudes flow exists) request a change, but never modify anything directly.
// Confirmed with the user 2026-09-02 — deliberately more permissive for DIRECTIVO than
// v1's own PERMS table (which restricts these actions to ADMINISTRADOR only there); this
// is an intentional V2 change, not a bug ported from v1.
const MODIFY_ROLES: Rol[] = ["ADMINISTRADOR", "DIRECTIVO"];

export function canModify(rol: Rol | undefined | null): boolean {
  return !!rol && MODIFY_ROLES.includes(rol);
}

// Agencias-only carve-out (2026-10-02, user request): DIRECTIVO keeps full edit rights
// everywhere else (Terminales, Empresas, Usuarios EGM, Solicitudes approval), but in
// Agencias specifically it's now view-only like FRANQUICIADO/TECNICO — create/edit/delete
// go through AgenciaFormDialog there, so DIRECTIVO falls back to the same
// Solicitar-nueva-agencia/Solicitar-cambio-de-estado request flow those roles already use.
const MODIFY_AGENCIAS_ROLES: Rol[] = ["ADMINISTRADOR"];

export function canModifyAgencias(rol: Rol | undefined | null): boolean {
  return !!rol && MODIFY_AGENCIAS_ROLES.includes(rol);
}

// Who can see an agencia's EGM/WAM usuario+password in AgenciaDetailDialog's "Ver
// detalle" — ADMINISTRADOR (can also edit it) and DIRECTIVO (view-only now, but still
// trusted with the credentials — this is the whole point of the 2026-10-02 request).
// FRANQUICIADO/TECNICO never see it, same as before.
const VIEW_AGENCIA_CREDENCIALES_ROLES: Rol[] = ["ADMINISTRADOR", "DIRECTIVO"];

export function canViewAgenciaCredenciales(rol: Rol | undefined | null): boolean {
  return !!rol && VIEW_AGENCIA_CREDENCIALES_ROLES.includes(rol);
}
