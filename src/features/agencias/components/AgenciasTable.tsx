import { Eye, Pencil, SendHorizontal, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { AgenciaEstadoPill } from "@/components/domain/AgenciaEstadoPill";
import { AgenciaDetailDialog } from "./AgenciaDetailDialog";
import { AgenciaFormDialog } from "./AgenciaFormDialog";
import { useDeleteAgencia } from "../hooks/useAgenciaMutations";
import { SolicitarEstadoDialog } from "@/features/solicitudes/components/SolicitarEstadoDialog";
import type { AgenciaRow, EmpresaRow } from "@/lib/supabase/types";
import type { TerminalListItem } from "@/features/terminales/hooks/useTerminales";
import { localNumberFromPos } from "@/utils/agencia";

interface Props {
  agencias: AgenciaRow[];
  isLoading: boolean;
  isError: boolean;
  empresasById: Map<string, EmpresaRow>;
  terminalesCountById: Map<string, number>;
  terminalesByAgenciaId: Map<string, TerminalListItem[]>;
  // ADMINISTRADOR/DIRECTIVO only — FRANQUICIADO/TECNICO are view-only (see
  // src/auth/permissions.ts). Ver detalle stays available to everyone.
  canEdit: boolean;
}

export function AgenciasTable({
  agencias,
  isLoading,
  isError,
  empresasById,
  terminalesCountById,
  terminalesByAgenciaId,
  canEdit,
}: Props) {
  const deleteAgencia = useDeleteAgencia();

  if (isError) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
        Error al cargar agencias
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-[20px] border border-border bg-surface p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (agencias.length === 0) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
        Sin agencias
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
      <table className="w-full min-w-[1000px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Agencia</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Sucursal</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Agente</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">N° local</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Estado</th>
            <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Term.</th>
            <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {agencias.map((a) => {
            const empresa = a.empresa_id ? empresasById.get(a.empresa_id) : undefined;
            const terminalesCount = terminalesCountById.get(a.id) ?? 0;
            return (
              <tr key={a.id} className="border-t border-border">
                <td className="px-3 py-3 font-semibold text-t1">{a.nombre}</td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{empresa?.nombre ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{a.departamento ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{a.encargado ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-t2">
                  {localNumberFromPos(a.pos) ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <AgenciaEstadoPill estado={a.estado} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold text-t1">
                  {terminalesCount}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-0.5">
                    <AgenciaDetailDialog
                      agencia={a}
                      empresaNombre={empresa?.nombre ?? ""}
                      terminalesCount={terminalesCount}
                      terminales={terminalesByAgenciaId.get(a.id) ?? []}
                      trigger={
                        <button
                          type="button"
                          title="Ver detalle"
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg"
                        >
                          <Eye size={15} />
                        </button>
                      }
                    />
                    {canEdit && (
                      <>
                        <AgenciaFormDialog
                          agencia={a}
                          trigger={
                            <button
                              type="button"
                              title="Editar"
                              className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg"
                            >
                              <Pencil size={15} />
                            </button>
                          }
                        />
                        <button
                          type="button"
                          title="Eliminar"
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-negative hover:bg-negative-tint"
                          onClick={() => {
                            if (
                              confirm(
                                `¿Eliminar "${a.nombre}" permanentemente?\n\nLas ${terminalesCount} terminal(es) asignada(s) quedarán DISPONIBLES, sin agencia. Esta acción no se puede deshacer.`,
                              )
                            ) {
                              deleteAgencia.mutate(a.id);
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    {!canEdit && (
                      <SolicitarEstadoDialog
                        agencia={a}
                        trigger={
                          <button
                            type="button"
                            title="Solicitar cambio de estado"
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-blue hover:bg-blue-tint"
                          >
                            <SendHorizontal size={15} />
                          </button>
                        }
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
