import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input, Label, Select } from "@/components/ui/Input";
import { getWamPosGroups, sugerirNombreGrupoNuevo, sugerirPosGroup } from "@/lib/wamApi/wamWrite";

export interface WamSyncState {
  enabled: boolean;
  // "" = nothing chosen yet, "__nuevo" = create a new group, otherwise an existing WAM group id.
  grupo: string;
  nombreNuevo: string;
  // Once the user touches the selector, stop overwriting it with the automatic suggestion.
  touched: boolean;
}

export const WAM_SYNC_INICIAL: WamSyncState = { enabled: true, grupo: "", nombreNuevo: "", touched: false };

interface Props {
  open: boolean;
  empresaNombre: string;
  departamento: string;
  // nombre of the OTHER agencias of the same empresa + sucursal — used to find the group
  // they already live in.
  siblingNombres: string[];
  value: WamSyncState;
  onChange: (next: WamSyncState) => void;
}

// Create-mode only. Mirrors a new agencia into WAM (real production): its Point of Sale,
// placed in a POS Group. The group is suggested from sibling agencias but always confirmed
// by the user here, because WAM names don't match ours exactly.
export function WamSyncSection({ open, empresaNombre, departamento, siblingNombres, value, onChange }: Props) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wam", "pos-groups"],
    queryFn: getWamPosGroups,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const grupos = useMemo(() => data?.grupos ?? [], [data]);
  const siblingKey = siblingNombres.join("|");

  useEffect(() => {
    if (!data || value.touched || !empresaNombre || !departamento) return;
    const sugerido = sugerirPosGroup(grupos, siblingNombres);
    const nombreNuevo = sugerirNombreGrupoNuevo(grupos, empresaNombre, departamento);
    const grupo = sugerido ? sugerido.id : "__nuevo";
    if (value.grupo !== grupo || value.nombreNuevo !== nombreNuevo) {
      onChange({ ...value, grupo, nombreNuevo });
    }
    // siblingNombres is tracked through siblingKey (a fresh array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, value.touched, empresaNombre, departamento, siblingKey]);

  const sugeridoId = useMemo(() => sugerirPosGroup(grupos, siblingNombres)?.id, [grupos, siblingNombres]);

  return (
    <div className="mt-3 rounded-lg border border-border bg-bg p-3">
      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-bold text-t1">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="h-4 w-4"
        />
        Crear también en WAM
      </label>
      <p className="mt-1 text-[11px] text-t3">
        Crea el punto de venta en WAM (producción) y asigna ahí las terminales elegidas.
      </p>

      {value.enabled && (
        <div className="mt-2 space-y-2">
          <Label htmlFor="wam-grupo">POS Group</Label>
          {isLoading ? (
            <p className="text-xs text-t3">Cargando grupos de WAM… (puede tardar unos segundos)</p>
          ) : isError ? (
            <p className="text-xs text-negative">
              No se pudieron cargar los grupos de WAM.{" "}
              <button type="button" className="font-semibold underline" onClick={() => refetch()}>
                Reintentar
              </button>
            </p>
          ) : (
            <>
              <Select
                id="wam-grupo"
                value={value.grupo}
                onChange={(e) => onChange({ ...value, grupo: e.target.value, touched: true })}
                className="w-full !rounded-lg"
              >
                <option value="">Selecciona...</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                    {g.id === sugeridoId ? "  (sugerido)" : ""}
                  </option>
                ))}
                <option value="__nuevo">➕ Crear grupo nuevo…</option>
              </Select>
              {value.grupo === "__nuevo" && (
                <div>
                  <Label htmlFor="wam-grupo-nuevo">Nombre del grupo nuevo</Label>
                  <Input
                    id="wam-grupo-nuevo"
                    value={value.nombreNuevo}
                    onChange={(e) => onChange({ ...value, nombreNuevo: e.target.value, touched: true })}
                    className="w-full !rounded-lg font-mono"
                  />
                  <p className="mt-1 text-[11px] text-t3">Se crea vacío (sin usuarios); asígnalos luego en WAM.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
