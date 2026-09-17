import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, EyeOff, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { ACCESO_WAM_ESTADOS, type AccesoWamRow } from "@/lib/supabase/types";
import { generatePassword, generateUsuarioWam } from "@/utils/credentials";
import {
  useCreateAccesoWam,
  useUpdateAccesoWam,
  type AccesoWamFormValues,
} from "../hooks/useAccesoWamMutations";

function emptyForm(): AccesoWamFormValues {
  return {
    cliente: "",
    empresa: "",
    usuario: "",
    password: generatePassword(),
    correo: "",
    url_wam: "",
    notas: "",
    estado: "ACTIVO",
  };
}

function toFormValues(a: AccesoWamRow): AccesoWamFormValues {
  return {
    cliente: a.cliente,
    empresa: a.empresa ?? "",
    usuario: a.usuario,
    password: a.password,
    correo: a.correo ?? "",
    url_wam: a.url_wam ?? "",
    notas: a.notas ?? "",
    estado: a.estado,
  };
}

interface Props {
  acceso?: AccesoWamRow;
  // Every other real acceso WAM (for auto-generating a collision-free usuario, and for
  // live duplicate usuario/password warnings — same pattern as UsuarioSistemaFormDialog's
  // `otros`) — excludes `acceso` itself so editing a row without changing its own
  // usuario/password doesn't warn against itself.
  otros: AccesoWamRow[];
  trigger: ReactNode;
}

// Mirrors v1's m-wam-acceso modal (index.html ~line 7288-7374) — no per-terminal/agencia
// tie-in, these are standalone credentials issued directly to an external client.
export function AccesoWamFormDialog({ acceso, otros, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AccesoWamFormValues>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createAcceso = useCreateAccesoWam();
  const updateAcceso = useUpdateAccesoWam();
  const isPending = createAcceso.isPending || updateAcceso.isPending;

  useEffect(() => {
    if (open) {
      setForm(acceso ? toFormValues(acceso) : emptyForm());
      setShowPassword(false);
      setErrors({});
    }
  }, [open, acceso]);

  // Usuario always tracks cliente+empresa live — same "always recompute" behavior as
  // AgenciaFormDialog's own POS auto-fill (index.html's updIdSub() equivalent), not an
  // "only if empty" guard: typing updates it immediately, and clearing cliente/empresa
  // clears usuario right back to "" instead of leaving a stale value behind (the bug the
  // user reported — a one-time "fill if empty" effect can generate a value but has no way
  // to un-generate it once cliente/empresa are emptied again). Create mode only; editing
  // an existing acceso never touches its own usuario.
  useEffect(() => {
    if (acceso || !open) return;
    setForm((f) => ({
      ...f,
      usuario: generateUsuarioWam(
        f.cliente,
        f.empresa,
        otros.map((o) => o.usuario),
      ),
    }));
  }, [acceso, open, form.cliente, form.empresa, otros]);

  const usuarioDuplicado = useMemo(
    () => !!form.usuario && otros.some((o) => o.usuario === form.usuario),
    [form.usuario, otros],
  );
  const passwordDuplicada = useMemo(
    () => !!form.password && otros.some((o) => o.password === form.password),
    [form.password, otros],
  );

  function handleRegenerarPassword() {
    setForm((f) => ({ ...f, password: generatePassword() }));
    setShowPassword(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!form.cliente.trim()) fieldErrors.cliente = "El nombre del cliente es obligatorio.";
    if (!form.usuario.trim()) fieldErrors.usuario = "El usuario WAM es obligatorio.";
    if (!form.password.trim()) fieldErrors.password = "La contraseña es obligatoria.";
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const values: AccesoWamFormValues = {
      cliente: form.cliente.trim(),
      empresa: form.empresa.trim(),
      usuario: form.usuario.trim(),
      password: form.password.trim(),
      correo: form.correo.trim(),
      url_wam: form.url_wam.trim(),
      notas: form.notas.trim(),
      estado: form.estado,
    };

    if (acceso) {
      await updateAcceso.mutateAsync({ id: acceso.id, values });
    } else {
      await createAcceso.mutateAsync(values);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={acceso ? "Editar acceso WAM" : "Nuevo acceso WAM"} className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wa-cliente">Cliente</Label>
              <Input
                id="wa-cliente"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className="w-full !rounded-lg"
                autoFocus
              />
              {errors.cliente && <p className="mt-1 text-xs text-negative">{errors.cliente}</p>}
            </div>
            <div>
              <Label htmlFor="wa-empresa">Empresa / operadora</Label>
              <Input
                id="wa-empresa"
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                className="w-full !rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wa-usuario">Usuario WAM</Label>
              <Input
                id="wa-usuario"
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                className="w-full !rounded-lg font-mono"
              />
              {errors.usuario && <p className="mt-1 text-xs text-negative">{errors.usuario}</p>}
              {usuarioDuplicado && <p className="mt-1 text-xs text-negative">⚠ Este usuario ya existe.</p>}
            </div>
            <div>
              <Label htmlFor="wa-correo">Correo</Label>
              <Input
                id="wa-correo"
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                className="w-full !rounded-lg"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="wa-url">URL WAM</Label>
            <Input
              id="wa-url"
              value={form.url_wam}
              onChange={(e) => setForm({ ...form, url_wam: e.target.value })}
              placeholder="https://"
              className="w-full !rounded-lg"
            />
          </div>

          <div>
            <Label htmlFor="wa-password" className="flex items-center justify-between">
              <span>Contraseña</span>
              <button
                type="button"
                onClick={handleRegenerarPassword}
                className="flex items-center gap-1 text-[11px] font-normal normal-case text-blue"
              >
                <RotateCw size={12} /> Regenerar
              </button>
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id="wa-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full !rounded-lg font-mono"
              />
              <button
                type="button"
                title={showPassword ? "Ocultar" : "Mostrar"}
                onClick={() => setShowPassword((v) => !v)}
                className="flex h-[42px] w-[34px] flex-none items-center justify-center text-t3 hover:text-t1"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-negative">{errors.password}</p>}
            {passwordDuplicada && <p className="mt-1 text-xs text-negative">⚠ Esta contraseña ya está en uso.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wa-estado">Estado</Label>
              <Select
                id="wa-estado"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as AccesoWamFormValues["estado"] })}
                className="w-full !rounded-lg"
              >
                {ACCESO_WAM_ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="wa-notas">Notas</Label>
            <textarea
              id="wa-notas"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-[18px] py-2.5 text-[13.5px] text-t1 focus:outline-none focus:ring-2 focus:ring-blue"
            />
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
