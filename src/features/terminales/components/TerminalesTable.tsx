import { Eye, History, MapPin, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EstadoPill } from "@/components/domain/EstadoPill";
import type { AgenciaRow, EmpresaRow } from "@/lib/supabase/types";
import type { TerminalListItem } from "../hooks/useTerminales";
import { TerminalFormDialog } from "./TerminalFormDialog";
import { TerminalLocationDialog } from "./TerminalLocationDialog";
import { useDeleteTerminal } from "../hooks/useTerminalMutations";

interface Props {
  terminales: TerminalListItem[];
  isLoading: boolean;
  isError: boolean;
  empresasById: Map<string, EmpresaRow>;
  agenciasById: Map<string, AgenciaRow>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  // ADMINISTRADOR/DIRECTIVO only — FRANQUICIADO/TECNICO are view-only (see
  // src/auth/permissions.ts). Ver detalle/Ver historial stay available to everyone.
  canEdit: boolean;
}

export function TerminalesTable({
  terminales,
  isLoading,
  isError,
  empresasById,
  agenciasById,
  selected,
  onToggle,
  onToggleAll,
  canEdit,
}: Props) {
  const deleteTerminal = useDeleteTerminal();

  if (isError) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
        Error al cargar terminales
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

  if (terminales.length === 0) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
        Sin terminales
      </div>
    );
  }

  const allSelected = terminales.length > 0 && terminales.every((t) => selected.has(t.id));

  return (
    <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
      <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr>
            <th className="w-9 px-3 py-2.5">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-[17px] w-[17px] rounded" />
            </th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Código</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Modelo</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Estado</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Sucursal</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Agencia</th>
            <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {terminales.map((t) => {
            const empresa = t.empresaId ? empresasById.get(t.empresaId) : undefined;
            const agencia = t.agenciaId ? agenciasById.get(t.agenciaId) : undefined;
            return (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => onToggle(t.id)}
                    className="h-[17px] w-[17px] rounded"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-t1">{t.codigo}</td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{t.modelo ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <EstadoPill estado={t.estado} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{empresa?.nombre ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{t.sucursal ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{t.agenciaNombre ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-0.5">
                    <button
                      type="button"
                      title="Ver detalle"
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      title="Ver historial"
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg"
                    >
                      <History size={15} />
                    </button>
                    {agencia && (
                      <TerminalLocationDialog
                        agencia={agencia}
                        trigger={
                          <button
                            type="button"
                            title="Ver ubicación"
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-blue hover:bg-blue-tint"
                          >
                            <MapPin size={15} />
                          </button>
                        }
                      />
                    )}
                    {canEdit && (
                      <>
                        <TerminalFormDialog
                          terminal={t}
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
                            if (confirm(`¿Eliminar terminal ${t.codigo}?`)) {
                              deleteTerminal.mutate(t.id);
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
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
