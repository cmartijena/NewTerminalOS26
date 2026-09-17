import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useCreateEmpresa, useUpdateEmpresa } from "../hooks/useEmpresaMutations";
import type { EmpresaRow } from "@/lib/supabase/types";

interface Props {
  empresa?: EmpresaRow;
  trigger: ReactNode;
}

export function EmpresaFormDialog({ empresa, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  const createEmpresa = useCreateEmpresa();
  const updateEmpresa = useUpdateEmpresa();
  const isPending = createEmpresa.isPending || updateEmpresa.isPending;

  useEffect(() => {
    if (open) {
      setNombre(empresa?.nombre ?? "");
      setError("");
    }
  }, [open, empresa]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = nombre.trim().toUpperCase();
    if (!value) {
      setError("Escribe el nombre de la empresa.");
      return;
    }
    if (empresa) {
      await updateEmpresa.mutateAsync({ id: empresa.id, nombre: value });
    } else {
      await createEmpresa.mutateAsync(value);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={empresa ? "Editar empresa" : "Nueva empresa"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="emp-nombre">Nombre</Label>
            <Input
              id="emp-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full !rounded-lg"
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-negative">{error}</p>}
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
