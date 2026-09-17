import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { SolicitudRow } from "@/lib/supabase/types";
import { ROL_LABEL, type Rol } from "@/auth/types";
import { useResponderSolicitud } from "../hooks/useSolicitudMutations";

const TIPO_LABEL: Record<string, string> = {
  TRASLADO_TERMINAL: "Traslado de terminal(es)",
  ESTADO_AGENCIA: "Cambio de estado de agencia",
  NUEVA_AGENCIA: "Nueva agencia",
};

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  PENDIENTE: { bg: "bg-amber-tint", color: "text-amber" },
  ACEPTADA: { bg: "bg-positive-tint", color: "text-positive" },
  RECHAZADA: { bg: "bg-negative-tint", color: "text-negative" },
};

interface Props {
  solicitud: SolicitudRow;
  canRespond: boolean;
}

export function SolicitudCard({ solicitud, canRespond }: Props) {
  const responder = useResponderSolicitud();
  const style = ESTADO_STYLE[solicitud.estado] ?? ESTADO_STYLE.PENDIENTE;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-t3">
            #{solicitud.id.slice(0, 8)} · {TIPO_LABEL[solicitud.tipo] ?? solicitud.tipo}
          </div>
          <div className="mt-0.5 text-[13.5px] font-semibold text-t1">{solicitud.mensaje}</div>
        </div>
        <span className={`flex-none rounded-full px-3 py-1 text-[11px] font-bold ${style.bg} ${style.color}`}>
          {solicitud.estado}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-t3">
        <span>
          👤 {solicitud.solicitado_por} ({ROL_LABEL[solicitud.solicitado_por_rol as Rol] ?? solicitud.solicitado_por_rol})
        </span>
        <span>📅 {new Date(solicitud.created_at).toLocaleString("es-PE")}</span>
        {solicitud.respondido_por && (
          <span className="text-positive">
            ✓ {solicitud.respondido_por}
            {solicitud.respondido_at && ` · ${new Date(solicitud.respondido_at).toLocaleString("es-PE")}`}
          </span>
        )}
      </div>

      {canRespond && solicitud.estado === "PENDIENTE" && (
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="secondary"
            className="!border-negative !text-negative"
            disabled={responder.isPending}
            onClick={() => responder.mutate({ solicitud, aceptar: false })}
          >
            <X size={14} /> Rechazar
          </Button>
          <Button
            variant="primary"
            disabled={responder.isPending}
            onClick={() => responder.mutate({ solicitud, aceptar: true })}
          >
            <Check size={14} /> Aceptar
          </Button>
        </div>
      )}
    </Card>
  );
}
