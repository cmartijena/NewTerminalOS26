import { countByEstado } from "@/utils/terminalesStats";
import type { TerminalEstadoDisplay } from "@/lib/supabase/estadoMapping";
import { cn } from "@/utils/cn";

const STATS: {
  key: keyof ReturnType<typeof countByEstado>;
  estado: TerminalEstadoDisplay;
  label: string;
  badgeBg: string;
  badgeColor: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "enProduccion",
    estado: "EN PRODUCCION",
    label: "En producción",
    badgeBg: "bg-accent-tint",
    badgeColor: "text-accent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
      </svg>
    ),
  },
  {
    key: "disponibles",
    estado: "DISPONIBLE",
    label: "Disponibles",
    badgeBg: "bg-positive-tint",
    badgeColor: "text-positive",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4 10-10" />
      </svg>
    ),
  },
  {
    key: "noDisponible",
    estado: "NO DISPONIBLE",
    label: "No disponible",
    badgeBg: "bg-negative-tint",
    badgeColor: "text-negative",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l9 16H3z" />
        <line x1="12" y1="9" x2="12" y2="14" />
        <circle cx="12" cy="17" r="0.6" />
      </svg>
    ),
  },
  {
    key: "enAlmacen",
    estado: "ALMACEN",
    label: "En almacén",
    badgeBg: "bg-blue-tint",
    badgeColor: "text-blue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l9-5 9 5-9 5-9-5Z" />
        <path d="M3 8v8l9 5 9-5V8" />
      </svg>
    ),
  },
];

interface Props {
  terminales: { estado: TerminalEstadoDisplay }[];
  activeEstado: string;
  onSelectEstado: (estado: string) => void;
}

// Counts are computed from whatever `terminales` the page passes in — pass the
// already-filtered list so these cards move together with the table instead of always
// showing the unfiltered global totals. Each card also acts as a quick filter (click to
// filter the table to that estado, click again to clear) — mirrors v1's efbtn quick
// filter buttons on the dashboard.
export function TerminalesStatRow({ terminales, activeEstado, onSelectEstado }: Props) {
  const counts = countByEstado(terminales);

  return (
    <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-4">
      {STATS.map((stat) => {
        const active = activeEstado === stat.estado;
        return (
          <button
            type="button"
            key={stat.key}
            onClick={() => onSelectEstado(active ? "" : stat.estado)}
            className={cn(
              "flex items-center gap-3 rounded-[20px] border bg-surface p-4 text-left transition-colors",
              active ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-t3",
            )}
          >
            <div
              className={`flex h-9 w-9 flex-none items-center justify-center rounded-[11px] ${stat.badgeBg} ${stat.badgeColor} [&_svg]:h-[18px] [&_svg]:w-[18px]`}
            >
              {stat.icon}
            </div>
            <div>
              <div className="font-mono text-[21px] font-bold text-t1">{counts[stat.key]}</div>
              <div className="text-[11px] font-bold text-t2">{stat.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
