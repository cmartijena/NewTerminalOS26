import { cn } from "@/utils/cn";

interface Props {
  empresas: string[];
  seleccionadas: Set<string>;
  onToggle: (empresa: string) => void;
  onClear: () => void;
}

// Shared by every WAM report tab that has a real empresa field in its data (Dinero,
// Ranking Tiendas, Terminales) — drives both what's shown on screen and what "Exportar
// PDF" includes (none selected = todas). Ranking Juegos has no equivalent: por_juego
// doesn't tie a game to any one empresa, so it doesn't use this.
export function EmpresaChipSelector({ empresas, seleccionadas, onToggle, onClear }: Props) {
  if (empresas.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {empresas.map((e) => {
        const on = seleccionadas.has(e);
        return (
          <button
            key={e}
            type="button"
            onClick={() => onToggle(e)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors",
              on ? "border-accent bg-accent-tint text-accent" : "border-border bg-surface text-t2 hover:border-t3",
            )}
          >
            {e}
          </button>
        );
      })}
      {seleccionadas.size > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-t3 hover:text-t1"
        >
          Limpiar selección
        </button>
      )}
    </div>
  );
}
