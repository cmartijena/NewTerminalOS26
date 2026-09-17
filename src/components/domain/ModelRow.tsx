import { Skeleton } from "@/components/ui/Skeleton";
import { TERMINAL_MODELOS } from "@/lib/supabase/types";
import { useTerminalesOverview } from "@/hooks/useTerminalesOverview";

// Shared by Dashboard and Terminales — both show the same model-type breakdown.
export function ModelRow() {
  const { data, isLoading, isError } = useTerminalesOverview();

  return (
    <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-3 lg:grid-cols-5">
      {TERMINAL_MODELOS.map((modelo) => (
        <div key={modelo} className="rounded-[20px] border border-border bg-surface p-3 px-4 text-center">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-t3">{modelo}</div>
          {isError ? (
            <div className="mt-1 text-xs text-negative">—</div>
          ) : isLoading || !data ? (
            <Skeleton className="mx-auto mt-1 h-4 w-8" />
          ) : (
            <div className="mt-1 font-mono text-lg font-bold text-t1">{data.modelos[modelo]}</div>
          )}
        </div>
      ))}
    </div>
  );
}
