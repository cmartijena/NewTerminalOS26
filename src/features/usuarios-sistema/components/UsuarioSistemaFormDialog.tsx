import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, EyeOff, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ROLES, ROL_LABEL, type Rol } from "@/auth/types";
import { useEmpresas } from "@/hooks/useEmpresas";
import { generatePassword, generateUsuarioSistema } from "@/utils/credentials";
import type { UsuarioSistemaListRow } from "../hooks/useUsuariosSistema";
import {
  useCreateUsuarioSistema,
  useUpdateUsuarioSistema,
  type UsuarioSistemaFormValues,
} from "../hooks/useUsuarioSistemaMutations";

// Only this role picks specific empresas — mirrors v1's ROLES_CON_EMPRESAS
// (index.html ~line 6320). Every other role sees every empresa regardless.
const ROLES_CON_EMPRESAS: Rol[] = ["FRANQUICIADO"];

function emptyForm(): UsuarioSistemaFormValues {
  return { nombre: "", email: "", usuario: "", rol: "ADMINISTRADOR", empresas: [] };
}

function toFormValues(u: UsuarioSistemaListRow): UsuarioSistemaFormValues {
  return {
    nombre: u.nombre,
    email: u.email ?? "",
    usuario: u.usuario,
    rol: u.rol as Rol,
    empresas: u.empresas,
  };
}

interface Props {
  usuario?: UsuarioSistemaListRow;
  // Every other real usuario (for a live duplicate-usuario warning, mirrors v1's
  // cu-usr-warn — index.html ~line 6386) — excludes `usuario` itself so editing a row
  // without changing its own usuario doesn't warn against itself. No password-duplicate
  // check anymore — the column is write-only now, so there's nothing to compare against
  // (same limitation already accepted for agencias/accesos_wam's write-only fields).
  otros: UsuarioSistemaListRow[];
  trigger: ReactNode;
}

export function UsuarioSistemaFormDialog({ usuario, otros, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UsuarioSistemaFormValues>(emptyForm());
  // null = "leave the existing password untouched" (edit mode's default — the real
  // current value can never be read back to show here). Create mode always starts with a
  // freshly generated one, since a brand-new row has no existing password to preserve.
  const [password, setPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: empresas } = useEmpresas();
  const createUsuario = useCreateUsuarioSistema();
  const updateUsuario = useUpdateUsuarioSistema();
  const isPending = createUsuario.isPending || updateUsuario.isPending;

  useEffect(() => {
    if (open) {
      setForm(usuario ? toFormValues(usuario) : emptyForm());
      setPassword(usuario ? null : generatePassword());
      setShowPassword(false);
      setErrors({});
    }
  }, [open, usuario]);

  // Auto-suggest usuario from nombre — only if still empty, so it never clobbers a manual
  // edit (mirrors v1's autoSuggestUser() "if empty" guard exactly). Create mode only.
  useEffect(() => {
    if (usuario || !open || form.usuario) return;
    if (!form.nombre.trim()) return;
    const suggestion = generateUsuarioSistema(
      form.nombre,
      otros.map((o) => o.usuario),
    );
    if (suggestion) setForm((f) => (f.usuario ? f : { ...f, usuario: suggestion }));
  }, [usuario, open, form.nombre, form.usuario, otros]);

  const usuarioDuplicado = useMemo(
    () => !!form.usuario && otros.some((o) => o.usuario === form.usuario),
    [form.usuario, otros],
  );

  function handleRegenerarPassword() {
    setPassword(generatePassword());
    setShowPassword(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!form.nombre.trim()) fieldErrors.nombre = "El nombre completo es obligatorio.";
    if (!form.usuario.trim()) fieldErrors.usuario = "El usuario es obligatorio.";
    if (!usuario && !password?.trim()) fieldErrors.password = "La contraseña es obligatoria.";
    if (form.rol === "FRANQUICIADO" && form.empresas.length === 0) {
      fieldErrors.empresas = "Asigna al menos una empresa.";
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const values: UsuarioSistemaFormValues = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      usuario: form.usuario.trim().toLowerCase().replace(/\s/g, "_"),
      rol: form.rol,
      empresas: form.empresas,
    };

    if (usuario) {
      await updateUsuario.mutateAsync({ id: usuario.id, values, password: password?.trim() || undefined });
    } else {
      await createUsuario.mutateAsync({ ...values, password: password?.trim() ?? "" });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={usuario ? "Editar usuario del sistema" : "Nuevo usuario del sistema"} className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Rol de acceso</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, rol: r, empresas: r === "FRANQUICIADO" ? form.empresas : [] })}
                  className={`rounded-lg border px-3 py-2 text-[12.5px] font-bold transition-colors ${
                    form.rol === r
                      ? "border-accent bg-accent-tint text-accent"
                      : "border-border bg-surface text-t2 hover:border-t3"
                  }`}
                >
                  {ROL_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {ROLES_CON_EMPRESAS.includes(form.rol) ? (
            <div className="rounded-lg border border-purple/20 bg-purple/5 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-purple">
                Empresas asignadas (verá solo estas)
              </div>
              <div className="flex flex-col gap-1.5">
                {empresas?.map((emp) => (
                  <label key={emp.id} className="flex cursor-pointer items-center gap-2 text-[13px] text-t1">
                    <input
                      type="checkbox"
                      checked={form.empresas.includes(emp.nombre)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.empresas, emp.nombre]
                          : form.empresas.filter((n) => n !== emp.nombre);
                        setForm({ ...form, empresas: next });
                      }}
                      className="h-4 w-4"
                    />
                    {emp.nombre}
                  </label>
                ))}
              </div>
              {errors.empresas && <p className="mt-1 text-xs text-negative">{errors.empresas}</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-blue/20 bg-blue/5 p-2.5 text-[12px] text-blue">
              Este rol tiene acceso a todas las empresas del sistema.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="us-nombre">Nombre completo</Label>
              <Input
                id="us-nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full !rounded-lg"
                autoFocus
              />
              {errors.nombre && <p className="mt-1 text-xs text-negative">{errors.nombre}</p>}
            </div>
            <div>
              <Label htmlFor="us-email">Correo electrónico</Label>
              <Input
                id="us-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full !rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="us-usuario">Usuario</Label>
              <Input
                id="us-usuario"
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                className="w-full !rounded-lg font-mono"
              />
              {errors.usuario && <p className="mt-1 text-xs text-negative">{errors.usuario}</p>}
              {usuarioDuplicado && <p className="mt-1 text-xs text-negative">⚠ Este usuario ya existe.</p>}
            </div>
            <div>
              <Label htmlFor="us-password" className="flex items-center justify-between">
                <span>Contraseña</span>
                <button
                  type="button"
                  onClick={handleRegenerarPassword}
                  className="flex items-center gap-1 text-[11px] font-normal normal-case text-blue"
                >
                  <RotateCw size={12} /> Regenerar
                </button>
              </Label>
              {password === null ? (
                // Edit mode, not yet regenerated this session — the real current value
                // can never be read back (column is write-only), so there's nothing to
                // show or edit here until "Regenerar" is clicked. Same pattern as
                // Agencias' Acceso EGM box before its own password became readable.
                <div className="flex h-[42px] items-center rounded-lg border border-border bg-bg px-3 font-mono text-[13px] text-t3">
                  •••••••••• (no se puede ver la contraseña actual)
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    id="us-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              )}
              {errors.password && <p className="mt-1 text-xs text-negative">{errors.password}</p>}
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
