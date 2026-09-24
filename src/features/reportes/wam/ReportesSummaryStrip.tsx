import { useMemo } from "react";
import { formatCurrency } from "@/utils/formatters";
import { useTerminalesOnline } from "@/features/dashboard/hooks/useTerminalesOnline";
import { useReporteOperador } from "./useReporteOperador";
import { usePorPos } from "./usePorPos";
import { usePorJuego } from "./usePorJuego";
import { normalizarFilas } from "./ticketsWam";
import { normalizarJuegos } from "./rankingJuegos";

interface Props {
  desde: string;
  hasta: string;
}

interface CellProps {
  label: string;
  value: string;
  color?: string;
}

function Cell({ label, value, color }: CellProps) {
  return (
    <div className="min-w-[140px] flex-1 border-r border-border p-[12px_16px] last:border-r-0">
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-t3">{label}</div>
      <div className={`mt-0.5 truncate font-mono text-[15px] font-bold ${color ?? "text-t1"}`}>{value}</div>
    </div>
  );
}

// Always-visible summary — the "panorama" the user asked to keep at hand no matter which
// area (Dinero/Tiendas/Juegos/Terminales) is open in the detail pane. Reuses the exact
// same React Query hooks each area's own panel calls (same queryKey → same cache entry,
// no extra network requests) so this costs nothing extra to keep mounted at all times.
export function ReportesSummaryStrip({ desde, hasta }: Props) {
  const operador = useReporteOperador(desde, hasta);
  const porPos = usePorPos(desde, hasta);
  const porJuego = usePorJuego(desde, hasta);
  const online = useTerminalesOnline();

  const topTienda = useMemo(() => {
    if (!porPos.data) return null;
    const rows = normalizarFilas(porPos.data.filas);
    return rows.reduce<(typeof rows)[number] | null>((best, r) => (!best || r.cashIn > best.cashIn ? r : best), null);
  }, [porPos.data]);

  const topJuego = useMemo(() => {
    if (!porJuego.data) return null;
    const rows = normalizarJuegos(porJuego.data.juegos);
    return rows.reduce<(typeof rows)[number] | null>((best, r) => (!best || r.spins > best.spins ? r : best), null);
  }, [porJuego.data]);

  return (
    <div className="flex flex-wrap rounded-[16px] border border-border bg-bg">
      <Cell
        label="Money In"
        value={operador.data ? formatCurrency(operador.data.total_in) : "—"}
        color="text-positive"
      />
      <Cell
        label="Money Out"
        value={operador.data ? formatCurrency(operador.data.total_out) : "—"}
        color="text-negative"
      />
      <Cell label="Top Tienda" value={topTienda ? topTienda.pos : "—"} />
      <Cell label="Top Juego" value={topJuego ? topJuego.nombre : "—"} />
      <Cell
        label="Terminales activas"
        value={online.data ? `${online.data.online} / ${online.data.total}` : "—"}
        color="text-blue"
      />
    </div>
  );
}
