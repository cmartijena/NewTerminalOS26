import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { TERMINAL_MODELOS } from "@/lib/supabase/types";
import { TERMINAL_ESTADOS_DISPLAY } from "@/lib/supabase/estadoMapping";
import { useVisibleEmpresas as useEmpresas } from "@/auth/useVisibleEmpresas";
import { useAgencias } from "@/hooks/useAgencias";
import { useCreateTerminal, useUpdateTerminal } from "../hooks/useTerminalMutations";
import type { TerminalListItem } from "../hooks/useTerminales";

const terminalSchema = z.object({
  codigo: z.string().min(1, "Requerido"),
  modelo: z.enum(TERMINAL_MODELOS),
  estado: z.enum(TERMINAL_ESTADOS_DISPLAY),
  empresaId: z.string().optional(),
  agenciaId: z.string().optional(),
});

type FormState = z.infer<typeof terminalSchema>;

function emptyForm(): FormState {
  return { codigo: "", modelo: "WALL", estado: "DISPONIBLE", empresaId: "", agenciaId: "" };
}

interface Props {
  terminal?: TerminalListItem;
  trigger: React.ReactNode;
}

export function TerminalFormDialog({ terminal, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: empresas } = useEmpresas();
  const { data: agencias } = useAgencias();
  const createTerminal = useCreateTerminal();
  const updateTerminal = useUpdateTerminal();

  useEffect(() => {
    if (open) {
      setForm(
        terminal
          ? {
              codigo: terminal.codigo,
              modelo: (terminal.modelo as FormState["modelo"]) ?? "WALL",
              estado: terminal.estado,
              empresaId: terminal.empresaId ?? "",
              agenciaId: terminal.agenciaId ?? "",
            }
          : emptyForm(),
      );
      setErrors({});
    }
  }, [open, terminal]);

  // Empresa is not stored on the terminal — it's just a filter here to narrow the
  // Agencia list, matching v1's cascading ET-EMP -> ET-AG selects.
  const agenciasFiltradas = useMemo(
    () => (agencias ?? []).filter((a) => !form.empresaId || a.empresa_id === form.empresaId),
    [agencias, form.empresaId],
  );

  const isPending = createTerminal.isPending || updateTerminal.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = terminalSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    const values = {
      codigo: result.data.codigo,
      modelo: result.data.modelo,
      estado: result.data.estado,
      agencia_id: result.data.agenciaId || null,
    };

    if (terminal) {
      await updateTerminal.mutateAsync({ id: terminal.id, values });
    } else {
      await createTerminal.mutateAsync(values);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={terminal ? "Editar terminal" : "Nueva terminal"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
              className="w-full !rounded-lg font-mono"
            />
            {errors.codigo && <p className="mt-1 text-xs text-negative">{errors.codigo}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modelo">Modelo</Label>
              <Select
                id="modelo"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value as FormState["modelo"] })}
                className="w-full !rounded-lg"
              >
                {TERMINAL_MODELOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                id="estado"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as FormState["estado"] })}
                className="w-full !rounded-lg"
              >
                {TERMINAL_ESTADOS_DISPLAY.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="empresa">Empresa</Label>
              <Select
                id="empresa"
                value={form.empresaId}
                onChange={(e) => setForm({ ...form, empresaId: e.target.value, agenciaId: "" })}
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
              <Label htmlFor="agencia">Agencia</Label>
              <Select
                id="agencia"
                value={form.agenciaId}
                onChange={(e) => setForm({ ...form, agenciaId: e.target.value })}
                className="w-full !rounded-lg"
              >
                <option value="">Sin asignar</option>
                {agenciasFiltradas.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.nombre} — {ag.departamento}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
