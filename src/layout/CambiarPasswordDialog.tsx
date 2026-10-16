import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { cambiarPasswordPropia } from "@/lib/supabase/logCuentas";

const MENSAJES: Record<string, string> = {
  ACTUAL_INCORRECTA: "La contraseña actual no es correcta.",
  NUEVA_CORTA: "La nueva contraseña debe tener al menos 8 caracteres.",
  NUEVA_IGUAL: "La nueva contraseña debe ser distinta a la actual.",
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full !rounded-lg"
          autoFocus={autoFocus}
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
  );
}

// Self-service: any logged-in role can change their OWN password. The check happens in
// the cambiar_password_propia() RPC (it re-verifies the current password server-side and
// writes the change to the account log) — the browser never gets to skip that step.
export function CambiarPasswordDialog({ trigger }: { trigger: ReactNode }) {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setActual("");
      setNueva("");
      setConfirmar("");
      setError(null);
      setHecho(false);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva !== confirmar) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (nueva.length < 8) {
      setError(MENSAJES.NUEVA_CORTA);
      return;
    }
    if (!currentUser) return;
    setPending(true);
    try {
      const res = await cambiarPasswordPropia(currentUser.usuario, actual, nueva);
      if (res === "OK") setHecho(true);
      else setError(MENSAJES[res] ?? "No se pudo cambiar la contraseña.");
    } catch (err) {
      console.error("Cambiar contraseña error:", err);
      setError("No se pudo cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Cambiar mi contraseña">
        {hecho ? (
          <div className="space-y-4">
            <p className="text-sm text-t1">Tu contraseña se actualizó. Úsala la próxima vez que ingreses.</p>
            <div className="flex justify-end">
              <Button type="button" variant="primary" onClick={() => setOpen(false)}>
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <PasswordField id="pw-actual" label="Contraseña actual" value={actual} onChange={setActual} autoComplete="current-password" autoFocus />
            <PasswordField id="pw-nueva" label="Nueva contraseña (mín. 8 caracteres)" value={nueva} onChange={setNueva} autoComplete="new-password" />
            <PasswordField id="pw-confirmar" label="Repite la nueva contraseña" value={confirmar} onChange={setConfirmar} autoComplete="new-password" />
            {error && <p className="text-xs text-negative">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Guardando..." : "Cambiar contraseña"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
