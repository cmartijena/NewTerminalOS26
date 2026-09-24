import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { useVisibleEmpresas as useEmpresas } from "@/auth/useVisibleEmpresas";
import { useAgencias } from "@/hooks/useAgencias";
import type { TerminalListItem } from "../hooks/useTerminales";
import { useBulkAsignarAgencia } from "../hooks/useTerminalMutations";

interface Props {
  terminales: TerminalListItem[]; // the currently selected terminales
  trigger: ReactNode;
  onSubmitted?: () => void;
}

// Direct assignment (ADMINISTRADOR/DIRECTIVO only, canEdit) — not a request, unlike
// TrasladarTerminalDialog. Reuses useBulkAsignarAgencia, the same mutation
// useResponderSolicitud calls when approving a TRASLADO_TERMINAL request, so both paths
// land on the exact same estado rule (EN PRODUCCION only if the destino agencia is
// itself EN PRODUCCION, else ASIGNADO).
export function AsignarMultipleDialog({ terminales, trigger, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [agenciaId, setAgenciaId] = useState("");
  const [error, setError] = useState("");

  const { data: empresas } = useEmpresas();
  const { data: agencias } = useAgencias();
  const bulkAsignarAgencia = useBulkAsignarAgencia();

  useEffect(() => {
    if (open) {
      setEmpresaId("");
      setDepartamento("");
      setAgenciaId("");
      setError("");
    }
  }, [open]);

  // Empresa → Sucursal → Agencia, same 3-level cascade as AgenciaFormDialog's create mode
  // — separate selectors instead of one long "AGENCIA — SUCURSAL" dropdown (user request
  // 2026-09-07: too much crammed into a single select).
  const sucursalOptions = useMemo(() => {
    if (!empresaId) return [];
    const set = new Set(
      (agencias ?? [])
        .filter((a) => a.empresa_id === empresaId && a.departamento)
        .map((a) => a.departamento as string),
    );
    return [...set].sort();
  }, [agencias, empresaId]);

  const agenciaOptions = useMemo(
    () =>
      (agencias ?? []).filter(
        (a) => a.empresa_id === empresaId && (!departamento || a.departamento === departamento),
      ),
    [agencias, empresaId, departamento],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId) {
      setError("Selecciona la empresa.");
      return;
    }
    if (!agenciaId) {
      setError("Selecciona la agencia destino.");
      return;
    }
    setError("");

    const agenciaDestino = agencias?.find((a) => a.id === agenciaId);
    const nuevoEstado = agenciaDestino?.estado === "EN PRODUCCION" ? "EN PRODUCCION" : "ASIGNADO";

    await bulkAsignarAgencia.mutateAsync({
      ids: terminales.map((t) => t.id),
      agenciaId,
      estado: nuevoEstado,
    });

    setOpen(false);
    onSubmitted?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Asignar a agencia" className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-[13px] text-t2">
            <b className="text-t1">{terminales.length}</b> terminal(es) seleccionada(s):{" "}
            <span className="font-mono text-[12px]">{terminales.map((t) => t.codigo).join(", ")}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="am-empresa">Empresa</Label>
              <Select
                id="am-empresa"
                value={empresaId}
                onChange={(e) => {
                  setEmpresaId(e.target.value);
                  setDepartamento("");
                  setAgenciaId("");
                }}
                className="w-full !rounded-lg"
              >
                <option value="">Selecciona...</option>
                {empresas?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="am-sucursal">Sucursal</Label>
              <Select
                id="am-sucursal"
                value={departamento}
                onChange={(e) => {
                  setDepartamento(e.target.value);
                  setAgenciaId("");
                }}
                disabled={!empresaId}
                className="w-full !rounded-lg"
              >
                <option value="">Todas</option>
                {sucursalOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="am-agencia">Agencia destino</Label>
              <Select
                id="am-agencia"
                value={agenciaId}
                onChange={(e) => setAgenciaId(e.target.value)}
                disabled={!empresaId}
                className="w-full !rounded-lg"
              >
                <option value="">Selecciona...</option>
                {agenciaOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </Select>
              {error && <p className="mt-1 text-xs text-negative">{error}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={bulkAsignarAgencia.isPending}>
              {bulkAsignarAgencia.isPending ? "Asignando..." : "Asignar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
