import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objetivoNombre: string;
  // Resolves true when the password was accepted (the caller closes the dialog).
  onConfirm: (adminPassword: string) => Promise<boolean>;
}

// Re-authentication before revealing someone's password: the server only releases it to
// a real ADMINISTRADOR credential (admin_ver_password), and logs every reveal.
export function ConfirmarAdminDialog({ open, onOpenChange, objetivoNombre, onConfirm }: Props) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setShow(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const ok = await onConfirm(password);
      if (!ok) setError("Contraseña incorrecta.");
    } catch (err) {
      console.error("Ver contraseña error:", err);
      setError("No se pudo consultar la contraseña. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Confirma tu contraseña">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-[13px] text-t2">
            Para ver la contraseña de <b className="text-t1">{objetivoNombre}</b> confirma la tuya. Esta consulta queda
            registrada en la actividad.
          </p>
          <div>
            <Label htmlFor="admin-pw">Tu contraseña de administrador</Label>
            <div className="flex items-center gap-1">
              <Input
                id="admin-pw"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full !rounded-lg"
                autoFocus
                required
              />
              <button
                type="button"
                title={show ? "Ocultar" : "Mostrar"}
                onClick={() => setShow((v) => !v)}
                className="flex h-[42px] w-[34px] flex-none items-center justify-center text-t3 hover:text-t1"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-negative">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Verificando..." : "Ver contraseña"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
