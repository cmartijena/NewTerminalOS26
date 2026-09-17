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
