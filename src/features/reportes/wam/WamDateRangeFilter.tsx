import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { firstOfMonth, isoDaysAgo, lastOfMonth, todayIso } from "./peruDate";

interface Props {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  children?: React.ReactNode;
}

// Shared date-range header for every WAM report tab (Tickets WAM, Ranking Tiendas,
// Ranking Juegos) — quick-period buttons mirror v1's repSetPeriodo shortcuts.
export function WamDateRangeFilter({ desde, hasta, onChange, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[12px] font-semibold text-t3">Fecha</span>
      <Input type="date" value={desde} onChange={(e) => onChange(e.target.value, hasta)} aria-label="Desde" />
      <span className="text-[13px] text-t3">a</span>
      <Input type="date" value={hasta} onChange={(e) => onChange(desde, e.target.value)} aria-label="Hasta" />
      <div className="flex flex-wrap gap-1.5">
        <Button variant="secondary" onClick={() => onChange(todayIso(), todayIso())}>
          Hoy
        </Button>
        <Button variant="secondary" onClick={() => onChange(isoDaysAgo(1), isoDaysAgo(1))}>
          Ayer
        </Button>
        <Button variant="secondary" onClick={() => onChange(isoDaysAgo(7), todayIso())}>
          Última semana
        </Button>
        <Button variant="secondary" onClick={() => onChange(firstOfMonth(0), todayIso())}>
          Este mes
        </Button>
        <Button variant="secondary" onClick={() => onChange(firstOfMonth(1), lastOfMonth(1))}>
          Mes anterior
        </Button>
      </div>
      <div className="ml-auto flex items-center gap-2.5">{children}</div>
    </div>
  );
}
