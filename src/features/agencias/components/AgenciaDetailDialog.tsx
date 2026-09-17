import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { AgenciasMap } from "@/components/map/AgenciasMap";
import { AgenciaEstadoPill } from "@/components/domain/AgenciaEstadoPill";
import { EstadoPill } from "@/components/domain/EstadoPill";
import type { AgenciaRow } from "@/lib/supabase/types";
import type { TerminalListItem } from "@/features/terminales/hooks/useTerminales";
import { localNumberFromPos } from "@/utils/agencia";
import { formatFecha } from "@/utils/fecha";

interface Props {
  agencia: AgenciaRow;
  empresaNombre: string;
  terminalesCount: number;
  terminales: TerminalListItem[];
  trigger: ReactNode;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-t3">{label}</div>
      <div className="text-[13px] text-t1">{value}</div>
    </div>
  );
}

export function AgenciaDetailDialog({ agencia, empresaNombre, terminalesCount, terminales, trigger }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={agencia.nombre} className="max-w-4xl">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.2fr]">
          {/* Left column: visuals */}
          <div className="space-y-3">
            {agencia.foto_url && (
              <img
                src={agencia.foto_url}
                alt={agencia.nombre}
                className="h-40 w-full rounded-lg object-cover"
              />
            )}
            <div className="h-[260px] overflow-hidden rounded-lg border border-border">
              <AgenciasMap agencias={[agencia]} selectedId={agencia.id} />
            </div>
          </div>

          {/* Right column: data + terminales */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border p-3.5">
              <Field label="Empresa" value={empresaNombre || "—"} />
              <Field label="Sucursal" value={agencia.departamento ?? "—"} />
              <Field label="Dirección" value={agencia.direccion ?? "—"} />
              <Field label="Agente" value={agencia.encargado ?? "—"} />
              <Field label="Celular" value={agencia.celular ?? "—"} />
              <Field label="N° local" value={localNumberFromPos(agencia.pos) ?? "—"} />
              <Field label="Correo" value={agencia.correo ?? "—"} />
              <Field label="Estado" value={<AgenciaEstadoPill estado={agencia.estado} />} />
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-3 rounded-lg border border-border p-3.5">
              <Field label="Fecha inicio" value={formatFecha(agencia.fecha_inicio)} />
              <Field label="Fecha pausa" value={formatFecha(agencia.fecha_pausa)} />
              <Field label="Fecha dada de baja" value={formatFecha(agencia.fecha_baja)} />
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-t3">
                Terminales ({terminalesCount})
              </div>
              {terminales.length === 0 ? (
                <div className="rounded-lg border border-border p-3 text-center text-xs text-t3">
                  Sin terminales asignadas
                </div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border">
                  {terminales.map((t, i) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-t1">{t.codigo}</span>
                      <span className="flex-none text-[11px] text-t3">{t.modelo ?? "—"}</span>
                      <EstadoPill estado={t.estado} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
