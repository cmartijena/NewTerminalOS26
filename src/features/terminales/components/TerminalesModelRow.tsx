import { TERMINAL_MODELOS } from "@/lib/supabase/types";
import { countByModelo } from "@/utils/terminalesStats";
import { cn } from "@/utils/cn";

interface Props {
  terminales: { modelo: string | null }[];
  activeModelo: string;
  onSelectModelo: (modelo: string) => void;
}

// Counts come from whatever `terminales` the page passes in — pass the already-filtered
// list so this moves together with the table and TerminalesStatRow instead of always
// showing the unfiltered global totals (see @/components/domain/ModelRow for the
// Dashboard's unfiltered equivalent). Each card also acts as a quick filter.
export function TerminalesModelRow({ terminales, activeModelo, onSelectModelo }: Props) {
  const counts = countByModelo(terminales);

  return (
    <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-3 lg:grid-cols-5">
      {TERMINAL_MODELOS.map((modelo) => {
        const active = activeModelo === modelo;
        return (
          <button
            type="button"
            key={modelo}
            onClick={() => onSelectModelo(active ? "" : modelo)}
            className={cn(
              "rounded-[20px] border bg-surface p-3 px-4 text-center transition-colors",
              active ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-t3",
            )}
          >
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-t3">{modelo}</div>
            <div className="mt-1 font-mono text-lg font-bold text-t1">{counts[modelo]}</div>
          </button>
        );
      })}
    </div>
  );
}
