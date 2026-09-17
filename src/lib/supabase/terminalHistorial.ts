// Shared helper for writing to `terminal_historial` — mirrors v1's registrarHistorialSupa()
// (index.html ~line 2669), called from every terminal-state-changing mutation in this app
// (Terminales CRUD/bulk actions, Solicitudes approval, Agencias estado cascades). Unlike
// v1 — which resolves usuario_id via `UDB.find(u => u.nombre === curUser?.nombre)` and, per
// project memory, ends up with `usuario_id` always null in every real row — V2 has a real
// authenticated user id (`useAuth().currentUser.id`) available at every call site, so this
// can populate it correctly.
import { supabase } from "./client";

export interface HistorialEntry {
  terminalId: string;
  // NOT NULL in the real schema (confirmed empirically 2026-09-14: an insert with
  // agencia_id null gets rejected — every one of the pre-existing 189 real rows already
  // has a non-null value here too). A terminal with no agencia at all (never assigned, or
  // just freed to no agencia) has nothing valid to put here — registrarHistorial() below
  // silently skips those entries rather than attempting a doomed insert. This is a real,
  // pre-existing limitation of this table, not something introduced here: v1's own
  // registrarHistorialSupa() would hit the same constraint for the same cases.
  agenciaId: string | null;
  usuarioId: string | null;
  estadoAnterior: string | null; // raw terminales.estado value, not the display value
  estadoNuevo: string | null; // raw terminales.estado value, not the display value
  agenciaOrigenId?: string | null;
  agenciaDestinoId?: string | null;
  obs: string;
}

// Best-effort: a logging failure shouldn't surface as a failure of the state change that
// already succeeded (same "resilient side-effect" posture this app already uses for
// welcome/reenviar emails) — logged to the console instead of thrown.
export async function registrarHistorial(entries: HistorialEntry[]): Promise<void> {
  const loggable = entries.filter((e) => e.agenciaId != null);
  if (loggable.length === 0) return;
  const { error } = await supabase.from("terminal_historial").insert(
    loggable.map((e) => ({
      terminal_id: e.terminalId,
      agencia_id: e.agenciaId,
      usuario_id: e.usuarioId,
      estado_anterior: e.estadoAnterior,
      estado_nuevo: e.estadoNuevo,
      agencia_origen_id: e.agenciaOrigenId ?? null,
      agencia_destino_id: e.agenciaDestinoId ?? null,
      observacion: e.obs,
      fecha: new Date().toISOString(),
    })),
  );
  if (error) console.error("No se pudo registrar en terminal_historial:", error.message);
}

interface TerminalPrevState {
  id: string;
  agencia_id: string | null;
  estado: string | null;
}

// Covers the repeated "select prior state → update → log one historial row per terminal"
// pattern used by every bulk/cascading terminal update in this app. `patch` carries only
// the raw columns actually being written; omit `agencia_id` from it when only estado is
// changing (e.g. "Cambio masivo") so the log correctly reflects the agencia not moving.
export async function updateTerminalesConHistorial<T extends { agencia_id?: string | null; estado?: string }>({
  ids,
  patch,
  usuarioId,
  obs,
  agenciaOrigenId,
  agenciaDestinoId,
}: {
  ids: string[];
  // May carry unrelated columns too (e.g. codigo/modelo on a single-terminal edit) — only
  // `agencia_id`/`estado` are read back out for the historial log itself.
  patch: T;
  usuarioId: string | null;
  obs: string;
  // Override the origen/destino pair the log shows — defaults to each terminal's real
  // prior/new agencia_id, but a caller like "traslado a ALMACEN" wants an explicit null
  // destino rather than whatever the patch happens to imply.
  agenciaOrigenId?: string | null;
  agenciaDestinoId?: string | null;
}): Promise<void> {
  if (ids.length === 0) return;

  const { data: prev, error: selError } = await supabase
    .from("terminales")
    .select("id, agencia_id, estado")
    .in("id", ids);
  if (selError) throw new Error(selError.message);

  const { error: updError } = await supabase.from("terminales").update(patch).in("id", ids);
  if (updError) throw new Error(updError.message);

  const agenciaIdNuevoPatched = "agencia_id" in patch;

  await registrarHistorial(
    ((prev ?? []) as TerminalPrevState[]).map((t) => {
      const agenciaIdNuevo = agenciaIdNuevoPatched ? (patch.agencia_id ?? null) : t.agencia_id;
      return {
        terminalId: t.id,
        // Prefer the terminal's new agencia; when it's being freed to none (traslado to
        // ALMACEN, liberar, DADA DE BAJA), fall back to the agencia it's leaving — that's
        // the only agencia this event is actually about, and the real NOT NULL constraint
        // on this column leaves no valid value at all when both are null (nothing to log
        // against — same real limitation useHistorial's own empresaId fallback already
        // accounts for by trying destino → origen → this field, in that order).
        agenciaId: agenciaIdNuevo ?? t.agencia_id,
        usuarioId,
        estadoAnterior: t.estado,
        estadoNuevo: patch.estado ?? t.estado,
        agenciaOrigenId: agenciaOrigenId !== undefined ? agenciaOrigenId : t.agencia_id,
        agenciaDestinoId: agenciaDestinoId !== undefined ? agenciaDestinoId : agenciaIdNuevo,
        obs,
      };
    }),
  );
}
