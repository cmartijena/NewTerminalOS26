import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { useVisibleEmpresas as useEmpresas } from "@/auth/useVisibleEmpresas";
import { useAgencias } from "@/hooks/useAgencias";
import type { TerminalListItem } from "@/features/terminales/hooks/useTerminales";
import { useCreateSolicitud } from "../hooks/useSolicitudMutations";

interface Props {
  terminales: TerminalListItem[]; // the currently selected terminales
  trigger: ReactNode;
  onSubmitted?: () => void;
}

export function TrasladarTerminalDialog({ terminales, trigger, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [destino, setDestino] = useState<"ALMACEN" | "AGENCIA">("ALMACEN");
  const [empresaId, setEmpresaId] = useState("");
  const [agenciaId, setAgenciaId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const { data: empresas } = useEmpresas();
  const { data: agencias } = useAgencias();
  const createSolicitud = useCreateSolicitud();

  useEffect(() => {
    if (open) {
      setDestino("ALMACEN");
      setEmpresaId("");
      setAgenciaId("");
      setMotivo("");
      setError("");
    }
  }, [open]);

  const agenciaOptions = useMemo(
    () => (agencias ?? []).filter((a) => !empresaId || a.empresa_id === empresaId),
    [agencias, empresaId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    if (destino === "AGENCIA" && !agenciaId) {
      setError("Selecciona la agencia destino.");
      return;
    }
    setError("");

    const codigos = terminales.map((t) => t.codigo).join(", ");
    const agenciaDestino = destino === "AGENCIA" ? agencias?.find((a) => a.id === agenciaId) : undefined;
    const destinoDesc = destino === "ALMACEN" ? "Almacén" : (agenciaDestino?.nombre ?? "");
    const mensaje = `${codigos} → ${destinoDesc} | ${motivo.trim()}`;

    await createSolicitud.mutateAsync({
      tipo: "TRASLADO_TERMINAL",
      mensaje,
      empresa_id: terminales[0]?.empresaId ?? null,
      data: {
        terminal_ids: terminales.map((t) => t.id),
        destino,
        agencia_destino_id: destino === "AGENCIA" ? agenciaId : null,
      },
    });

    setOpen(false);
    onSubmitted?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Solicitar traslado">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-[13px] text-t2">
            <b className="text-t1">{terminales.length}</b> terminal(es) seleccionada(s):{" "}
            <span className="font-mono text-[12px]">{terminales.map((t) => t.codigo).join(", ")}</span>
          </div>

          <div>
            <Label>Destino</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDestino("ALMACEN")}
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold ${
                  destino === "ALMACEN" ? "border-accent bg-accent-tint text-accent" : "border-border text-t2"
                }`}
              >
                📦 Al almacén
              </button>
              <button
                type="button"
                onClick={() => setDestino("AGENCIA")}
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold ${
                  destino === "AGENCIA" ? "border-accent bg-accent-tint text-accent" : "border-border text-t2"
                }`}
              >
                🏪 A otra agencia
              </button>
            </div>
          </div>

          {destino === "AGENCIA" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sol-empresa">Empresa</Label>
                <Select
                  id="sol-empresa"
                  value={empresaId}
                  onChange={(e) => {
                    setEmpresaId(e.target.value);
                    setAgenciaId("");
                  }}
                  className="w-full !rounded-lg"
                >
                  <option value="">Todas</option>
                  {empresas?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="sol-agencia">Agencia destino</Label>
                <Select
                  id="sol-agencia"
                  value={agenciaId}
                  onChange={(e) => setAgenciaId(e.target.value)}
                  className="w-full !rounded-lg"
                >
                  <option value="">Selecciona...</option>
                  {agenciaOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} — {a.departamento}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="sol-motivo">Motivo</Label>
            <textarea
              id="sol-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica el motivo del traslado..."
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {error && <p className="mt-1 text-xs text-negative">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={createSolicitud.isPending}>
              {createSolicitud.isPending ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
