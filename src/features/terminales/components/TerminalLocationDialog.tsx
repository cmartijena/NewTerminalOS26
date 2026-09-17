import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { AgenciasMap } from "@/components/map/AgenciasMap";
import type { AgenciaRow } from "@/lib/supabase/types";
import { localNumberFromPos } from "@/utils/agencia";

interface Props {
  agencia: AgenciaRow;
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

export function TerminalLocationDialog({ agencia, trigger }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={agencia.nombre}>
        <div className="space-y-3">
          {agencia.foto_url && (
            <img
              src={agencia.foto_url}
              alt={agencia.nombre}
              className="h-32 w-full rounded-lg object-cover"
            />
          )}
          <div className="h-[200px] overflow-hidden rounded-lg border border-border">
            <AgenciasMap agencias={[agencia]} selectedId={agencia.id} />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <Field label="Dirección" value={agencia.direccion ?? "—"} />
            <Field label="Sucursal" value={agencia.departamento ?? "—"} />
            <Field label="Agente" value={agencia.encargado ?? "—"} />
            <Field label="N° local" value={localNumberFromPos(agencia.pos) ?? "—"} />
            <Field label="Estado" value={agencia.estado} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
