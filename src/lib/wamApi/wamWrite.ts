import { wamFetch } from "./client";

// Endpoints that WRITE to WAM (real production) — see wam_api.py's "ESCRITURA EN WAM"
// section. Everything here is best-effort from TerminalOS's side: an agencia is always
// created in our own database first, and a WAM failure is reported, never rolled back.

export interface WamPosGroup {
  id: string;
  nombre: string;
  // The group's member POS names as one text blob, e.g. "[EMPRESA - AG01-X, EMPRESA - AG02-Y]".
  pos_texto: string;
}

export function getWamPosGroups() {
  return wamFetch<{ total: number; grupos: WamPosGroup[] }>("/api/wam/pos_groups");
}

export function crearWamPosGroup(name: string) {
  return wamFetch<{ ok: true; group_id: string | null }>("/api/wam/pos_group", {
    method: "POST",
    body: { name },
  });
}

export function crearWamPos(name: string, posGroupId: string) {
  return wamFetch<{ ok: true; pos_id: string | null }>("/api/wam/pos", {
    method: "POST",
    body: { name, pos_group_id: posGroupId },
  });
}

export function asignarTerminalWam(machineId: string, posId: string) {
  return wamFetch<{ ok: true; terminal_wam_id: string }>("/api/wam/terminal_assign", {
    method: "POST",
    body: { machine_id: machineId, pos_id: posId },
  });
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

// WAM's POS names don't reliably equal our `agencias.pos` (numbering drifts, e.g. WAM
// "TINBET LIMA - AG04- ALISOS" vs ours "AG13 - ALISOS"), so match on the agencia's own
// nombre instead: the group that already contains the most sibling agencias (same
// empresa + same sucursal) is the suggestion. null when no sibling is in any group.
export function sugerirPosGroup(grupos: WamPosGroup[], siblingNombres: string[]): WamPosGroup | null {
  const nombres = siblingNombres.map(norm).filter((n) => n.length >= 3);
  let mejor: WamPosGroup | null = null;
  let mejorScore = 0;
  for (const g of grupos) {
    const texto = norm(g.pos_texto);
    const score = nombres.filter((n) => texto.includes(n)).length;
    if (score > mejorScore) {
      mejor = g;
      mejorScore = score;
    }
  }
  return mejor;
}

// Existing groups follow EMPRESA-DEP-NNN (WINBET-LIM-001, TINBET-UCA-002, TINBET-ICA-003):
// the NNN is a running sequence per empresa prefix. Only a suggestion — the name is editable.
export function sugerirNombreGrupoNuevo(grupos: WamPosGroup[], empresaNombre: string, departamento: string): string {
  const prefijo = (empresaNombre.trim().split(/\s+/)[0] ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const dep = departamento.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  const usados = grupos
    .filter((g) => g.nombre.toUpperCase().startsWith(`${prefijo}-`))
    .map((g) => Number(/-(\d+)\s*$/.exec(g.nombre)?.[1] ?? 0));
  const siguiente = String(Math.max(0, ...usados) + 1).padStart(3, "0");
  return `${prefijo}-${dep}-${siguiente}`;
}

export type WamGrupoElegido = { tipo: "existente"; id: string } | { tipo: "nuevo"; nombre: string };

export interface SincronizarAgenciaWamInput {
  posName: string;
  grupo: WamGrupoElegido;
  machineIds: string[];
}

export interface SincronizarAgenciaWamResult {
  ok: boolean;
  pasos: string[];
  errores: string[];
}

// Runs the steps in order and stops at the first failure (later steps depend on earlier
// ones: no POS without its group, no terminal assignment without the POS).
export async function sincronizarAgenciaEnWam(input: SincronizarAgenciaWamInput): Promise<SincronizarAgenciaWamResult> {
  const pasos: string[] = [];
  const errores: string[] = [];
  try {
    let grupoId: string;
    if (input.grupo.tipo === "nuevo") {
      const g = await crearWamPosGroup(input.grupo.nombre);
      if (!g.group_id) throw new Error("WAM creó el grupo pero no devolvió su id");
      grupoId = g.group_id;
      pasos.push(`Grupo "${input.grupo.nombre}" creado en WAM`);
    } else {
      grupoId = input.grupo.id;
    }

    const pos = await crearWamPos(input.posName, grupoId);
    if (!pos.pos_id) throw new Error("WAM creó el POS pero no devolvió su id");
    pasos.push(`POS "${input.posName}" creado en WAM`);

    for (const machineId of input.machineIds) {
      try {
        await asignarTerminalWam(machineId, pos.pos_id);
        pasos.push(`Terminal ${machineId} asignada en WAM`);
      } catch (e) {
        errores.push(`Terminal ${machineId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errores.push(e instanceof Error ? e.message : String(e));
  }
  return { ok: errores.length === 0, pasos, errores };
}
