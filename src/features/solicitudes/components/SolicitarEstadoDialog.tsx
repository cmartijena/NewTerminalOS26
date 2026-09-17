import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { AGENCIA_ESTADOS, type AgenciaRow } from "@/lib/supabase/types";
import { useCreateSolicitud } from "../hooks/useSolicitudMutations";

interface Props {
  agencia: AgenciaRow;
  trigger: ReactNode;
}

export function SolicitarEstadoDialog({ agencia, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<(typeof AGENCIA_ESTADOS)[number]>(agencia.estado);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const createSolicitud = useCreateSolicitud();

  useEffect(() => {
    if (open) {
      setNuevoEstado(agencia.estado);
      setMotivo("");
      setError("");
    }
  }, [open, agencia.estado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    if (nuevoEstado === agencia.estado) {
      setError("Elige un estado distinto al actual.");
      return;
    }
    setError("");

    await createSolicitud.mutateAsync({
      tipo: "ESTADO_AGENCIA",
      mensaje: `${agencia.nombre} → ${nuevoEstado}: ${motivo.trim()}`,
      empresa_id: agencia.empresa_id,
      data: { agencia_id: agencia.id, nuevo_estado: nuevoEstado },
    });

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Solicitar cambio de estado">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-[13px] text-t2">
            Agencia: <b className="text-t1">{agencia.nombre}</b> · estado actual:{" "}
            <b className="text-t1">{agencia.estado}</b>
          </div>
          <div>
            <Label htmlFor="sol-est-nuevo">Nuevo estado</Label>
            <Select
              id="sol-est-nuevo"
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value as (typeof AGENCIA_ESTADOS)[number])}
              className="w-full !rounded-lg"
            >
              {AGENCIA_ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sol-est-motivo">Motivo</Label>
            <textarea
              id="sol-est-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica el motivo del cambio..."
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
