// Field-level types matching the REAL Supabase schema, confirmed 2026-09 by reading
// v1's actual index.html (SUPA_URL/queries) and a direct read-only inspection of the
// live tables. Do not go back to guessing — this is ground truth.

export { TERMINAL_ESTADOS_DISPLAY as TERMINAL_ESTADOS } from "./estadoMapping";
export type { TerminalEstadoDisplay as TerminalEstado } from "./estadoMapping";

// Confirmed against real data (terminales.modelo values in production).
export const TERMINAL_MODELOS = ["TOTEM", "WALL", "SMALL WALL", "BOX SIMPLE", "BOXDUAL"] as const;
export type TerminalModelo = (typeof TERMINAL_MODELOS)[number];

// `agencias.estado` — used as-is, no raw/display mapping layer (unlike terminales.estado).
export const AGENCIA_ESTADOS = ["EN PRODUCCION", "PENDIENTE", "INACTIVA", "DADA DE BAJA"] as const;
export type AgenciaEstado = (typeof AGENCIA_ESTADOS)[number];

// `agencias.rol` — the login role for that agencia's own EGM/WAM credentials (distinct
// from this app's own Rol in auth/types.ts). Confirmed against real data. Kept as a plain
// string on AgenciaRow (not this union) so an unexpected legacy value never breaks a read.
export const EGM_ROLES = ["CAJERO", "SUPERVISOR", "ADMINISTRADOR"] as const;
export type EgmRol = (typeof EGM_ROLES)[number];

// `terminales` has NO `empresa_id` or `sucursal` column — both come from the joined
// `agencias` row (agencias.empresa_id, agencias.departamento). `estado` here is the RAW
// DB value (ACTIVO/INACTIVO/NO DISPONIBLE/EN_TRASLADO/MANTENIMIENTO/ASIGNADO/ALMACEN/
// DADA DE BAJA) — always pass it through mapearEstado()/estadoParaSupa() at the
// read/write boundary, never compare it directly to a display-facing TerminalEstado.
export interface TerminalRow {
  id: string;
  codigo: string;
  modelo: string | null;
  estado: string;
  agencia_id: string | null;
  serie: string | null;
  observacion: string | null;
}

export type TerminalInsert = Omit<TerminalRow, "id">;
export type TerminalUpdate = Partial<TerminalInsert>;

// `solicitudes` is a NEW table (2026-09) — v1 never persisted this (its "Solicitudes"
// section is a client-side-only, localStorage-synced array with no backing Supabase
// table at all; confirmed by grepping every real `supa.from(...)` call in index.html).
// V2's schema is designed from scratch, grounded in the request *shapes* v1 actually
// produces (its `crearSolicitud()`/`ejecutar*Solicitud()` functions), not a ported table.
export const SOLICITUD_TIPOS = ["TRASLADO_TERMINAL", "ESTADO_AGENCIA", "NUEVA_AGENCIA"] as const;
export type SolicitudTipo = (typeof SOLICITUD_TIPOS)[number];

export const SOLICITUD_ESTADOS = ["PENDIENTE", "ACEPTADA", "RECHAZADA"] as const;
export type SolicitudEstado = (typeof SOLICITUD_ESTADOS)[number];

export interface TrasladoTerminalData {
  terminal_ids: string[];
  destino: "ALMACEN" | "AGENCIA";
  agencia_destino_id: string | null;
}

export interface EstadoAgenciaData {
  agencia_id: string;
  nuevo_estado: AgenciaEstado;
}

// One line of the per-model terminal request below — only models with real availability
// (per a live count of unassigned DISPONIBLE/ALMACEN terminales) are selectable in the
// form; a model with zero available shows "No hay actualmente" instead of an input.
export interface TerminalesSolicitados {
  modelo: TerminalModelo;
  cantidad: number;
}

// FRANQUICIADO/TECNICO can't create agencias directly (canModify), so a new one always
// starts as a request — the admin/directivo who approves it is the one who actually
// creates the row (useResponderSolicitud), computing the POS correlativo the same way
// AgenciaFormDialog does for a direct create. `terminales_solicitados` is informational
// only (shown to the approver) — approving does NOT auto-assign those terminal units;
// the admin still uses the existing Trasladar/Editar flows to actually hand them over.
export interface NuevaAgenciaData {
  empresa_id: string;
  departamento: string;
  nombre: string;
  encargado: string;
  celular: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
  terminales_solicitados: TerminalesSolicitados[];
}

export interface SolicitudRow {
  id: string;
  tipo: SolicitudTipo;
  estado: SolicitudEstado;
  mensaje: string | null;
  empresa_id: string | null;
  data: TrasladoTerminalData | EstadoAgenciaData | NuevaAgenciaData;
  solicitado_por: string;
  solicitado_por_rol: string;
  respondido_por: string | null;
  created_at: string;
  respondido_at: string | null;
}

// `empresas.nombre` doesn't exist — v1 uses `razon_social` as the display name.
export interface EmpresaRow {
  id: string;
  nombre: string;
}

// `password` was DB-blocked for anon SELECT from 2026-09-02 until 2026-09-05, when the
// user explicitly asked to see it in the Usuarios EGM list too (same reversal already
// applied to accesos_wam.password the same day, for the same reason). Both usuario and
// password are readable now.
export interface AgenciaRow {
  id: string;
  nombre: string;
  empresa_id: string | null;
  departamento: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  estado: AgenciaEstado;
  correo: string | null;
  encargado: string | null;
  // Added 2026-09 for the Solicitudes "Nueva agencia" request flow — v1 has no phone
  // field on agencias at all, this is a deliberate V2 addition, not a ported column.
  celular: string | null;
  // POS / agent code, e.g. "TINBET UCAYALI - AG04 - AMAZONAS 01" — the closest real
  // column to "número de agente".
  pos: string | null;
  // Photo of the physical agency location — most rows don't have one uploaded yet, so
  // every consumer of this field must handle null gracefully, not assume it's set.
  foto_url: string | null;
  // Added 2026-09 — auto-stamped (never hand-edited) on the estado transition that
  // matches each one: fecha_inicio on -> EN PRODUCCION, fecha_pausa on -> INACTIVA,
  // fecha_baja on -> DADA DE BAJA. See src/features/agencias/estadoFechas.ts.
  fecha_inicio: string | null;
  fecha_pausa: string | null;
  fecha_baja: string | null;
  // EGM/WAM login for this agencia's own local — see EGM_ROLES above and the
  // Usuarios EGM module (src/features/usuarios-egm/).
  usuario: string | null;
  password: string | null;
  rol: string | null;
}

// Not yet needed by any built screen — stubbed so the type surface exists.
export type HistorialTransferenciaRow = Record<string, unknown>;

// `usuarios_sistema` — the app's own login accounts (ADMINISTRADOR/DIRECTIVO/
// FRANQUICIADO/TECNICO). `password` has always been readable here (unlike
// agencias/accesos_wam before their 2026-09-05 reversal) — AuthContext.tsx's login()
// already depends on it being selectable. `rol` kept as a loose string (not the `Rol`
// union from auth/types.ts) to match this file's existing convention for AgenciaRow.rol —
// import and narrow to `Rol` where it matters (Usuarios Sistema feature code).
// `empresas` is an array of empresa NAMES (razon_social), meaningful only for
// FRANQUICIADO — every other role sees everything regardless of this field.
export interface UsuarioSistemaRow {
  id: string;
  nombre: string;
  email: string | null;
  usuario: string;
  password: string;
  rol: string;
  empresas: string[];
  activo: boolean;
  created_at: string;
}

// `accesos_wam` — real, separate table for direct-to-WAM credentials issued to external
// clients (not tied to any agencia — `empresa` here is free text, not a foreign key).
// v1's whole "Accesos WAM Personalizados" section (index.html ~line 7197-7389) is
// ADMINISTRADOR-only, stricter than this app's usual canModify (ADMINISTRADOR+DIRECTIVO).
// `password` IS included and readable here — unlike agencias.password/Usuarios EGM, the
// user explicitly asked (2026-09-05, twice, with a stated business reason: sharing the
// credentials by email once created) to see and edit it directly, reversing the
// "never read back" lockdown originally applied to this table on 2026-09-05. Only this
// table's password grant was reversed — agencias.password stays locked exactly as before.
export const ACCESO_WAM_ESTADOS = ["ACTIVO", "SUSPENDIDO", "INACTIVO"] as const;
export type AccesoWamEstado = (typeof ACCESO_WAM_ESTADOS)[number];

export interface AccesoWamRow {
  id: string;
  cliente: string;
  empresa: string | null;
  password: string;
  usuario: string;
  correo: string | null;
  url_wam: string | null;
  notas: string | null;
  estado: AccesoWamEstado;
  created_at: string;
}
