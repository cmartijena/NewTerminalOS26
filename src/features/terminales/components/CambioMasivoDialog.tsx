import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { TERMINAL_ESTADOS_DISPLAY, type TerminalEstadoDisplay } from "@/lib/supabase/estadoMapping";
import type { TerminalListItem } from "../hooks/useTerminales";
import { useBulkUpdateEstado } from "../hooks/useTerminalMutations";

interface Props {
  terminales: TerminalListItem[]; // the currently selected terminales
  trigger: ReactNode;
  onSubmitted?: () => void;
}

// Replaces the old window.prompt() stub — same picker pattern as AsignarMultipleDialog,
// just a plain estado select instead of an empresa/agencia cascade.
export function CambioMasivoDialog({ terminales, trigger, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<TerminalEstadoDisplay | "">("");
  const [error, setError] = useState("");

  const bulkUpdateEstado = useBulkUpdateEstado();

  useEffect(() => {
    if (open) {
      setEstado("");
      setError("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!estado) {
      setError("Selecciona el nuevo estado.");
      return;
    }
    setError("");

    await bulkUpdateEstado.mutateAsync({ ids: terminales.map((t) => t.id), estado });

    setOpen(false);
    onSubmitted?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Cambio masivo de estado">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-[13px] text-t2">
            <b className="text-t1">{terminales.length}</b> terminal(es) seleccionada(s):{" "}
            <span className="font-mono text-[12px]">{terminales.map((t) => t.codigo).join(", ")}</span>
          </div>

          <div>
            <Label htmlFor="cm-estado">Nuevo estado</Label>
            <Select
              id="cm-estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as TerminalEstadoDisplay)}
              className="w-full !rounded-lg"
            >
              <option value="">Selecciona...</option>
              {TERMINAL_ESTADOS_DISPLAY.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
            {error && <p className="mt-1 text-xs text-negative">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={bulkUpdateEstado.isPending}>
              {bulkUpdateEstado.isPending ? "Aplicando..." : "Aplicar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
