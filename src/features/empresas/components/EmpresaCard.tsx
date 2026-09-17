import { Pencil, Power } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { EmpresaRow } from "@/lib/supabase/types";
import { EmpresaFormDialog } from "./EmpresaFormDialog";
import { useDeactivateEmpresa } from "../hooks/useEmpresaMutations";

interface Props {
  empresa: EmpresaRow;
  terminalesCount: number;
  agenciasCount: number;
  enProduccionCount: number;
  canEdit: boolean;
}

function Stat({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div className="flex-1 text-center">
      <div className={`font-mono text-[20px] font-bold ${colorClass}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-t3">{label}</div>
    </div>
  );
}

export function EmpresaCard({ empresa, terminalesCount, agenciasCount, enProduccionCount, canEdit }: Props) {
  const deactivateEmpresa = useDeactivateEmpresa();

  return (
    <Card className="relative p-4">
      {canEdit && (
        <div className="absolute right-3 top-3 flex gap-0.5">
          <EmpresaFormDialog
            empresa={empresa}
            trigger={
              <button
                type="button"
                title="Editar"
                className="flex h-7 w-7 items-center justify-center rounded-full text-t3 hover:bg-bg"
              >
                <Pencil size={13} />
              </button>
            }
          />
          <button
            type="button"
            title="Desactivar empresa"
            className="flex h-7 w-7 items-center justify-center rounded-full text-t3 hover:bg-negative-tint hover:text-negative"
            onClick={() => {
              if (
                confirm(
                  `¿Desactivar ${empresa.nombre}? Dejará de aparecer en TerminalOS (sus agencias y terminales no se borran).`,
                )
              ) {
                deactivateEmpresa.mutate(empresa.id);
              }
            }}
          >
            <Power size={13} />
          </button>
        </div>
      )}
      <div className="mb-3 pr-14 text-[15px] font-bold text-t1">{empresa.nombre}</div>
      <div className="flex rounded-2xl bg-bg py-2.5">
        <Stat value={terminalesCount} label="Terminales" colorClass="text-accent" />
        <Stat value={agenciasCount} label="Agencias" colorClass="text-blue" />
        <Stat value={enProduccionCount} label="En prod." colorClass="text-positive" />
      </div>
    </Card>
  );
}
