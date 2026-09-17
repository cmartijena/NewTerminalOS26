import { Card } from "@/components/ui/Card";
import { EstadoPill } from "@/components/domain/EstadoPill";
import type { HistorialItem } from "../hooks/useHistorial";

interface Props {
  item: HistorialItem;
}

export function HistorialCard({ item }: Props) {
  const esTraslado = item.agenciaOrigenNombre || item.agenciaDestinoNombre;

  return (
    <Card className="p-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] text-t3">
          {new Date(item.fecha).toLocaleString("es-PE")}
        </span>
        <span className="font-mono text-[12.5px] font-semibold text-t1">{item.terminalCodigo}</span>
        {item.terminalModelo && <span className="text-[11px] text-t3">{item.terminalModelo}</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.estadoAnterior && (
          <>
            <EstadoPill estado={item.estadoAnterior} />
            <span className="text-t3">→</span>
          </>
        )}
        {item.estadoNuevo && <EstadoPill estado={item.estadoNuevo} />}
      </div>

      {esTraslado && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-t2">
          <span className="text-purple">↗</span>
          <span>{item.agenciaOrigenNombre ?? "—"}</span>
          <span className="text-t3">→</span>
          <span className="font-semibold">{item.agenciaDestinoNombre ?? "—"}</span>
        </div>
      )}

      {item.observacion && <div className="mt-1.5 text-[12px] italic text-t3">"{item.observacion}"</div>}
    </Card>
  );
}
