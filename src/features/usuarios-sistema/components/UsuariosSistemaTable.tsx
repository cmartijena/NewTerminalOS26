import { useState } from "react";
import { Check, Mail, Pencil, Power, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROL_LABEL, type Rol } from "@/auth/types";
import { useAuth } from "@/auth/AuthContext";
import { enviarCorreoBienvenida } from "@/lib/emailjs";
import { generatePassword } from "@/utils/credentials";
import type { UsuarioSistemaListRow } from "../hooks/useUsuariosSistema";
import {
  useDeleteUsuarioSistema,
  useRegenerarPasswordUsuarioSistema,
  useToggleUsuarioActivo,
} from "../hooks/useUsuarioSistemaMutations";
import { UsuarioSistemaFormDialog } from "./UsuarioSistemaFormDialog";

interface Props {
  usuarios: UsuarioSistemaListRow[];
  allUsuarios: UsuarioSistemaListRow[]; // unfiltered — passed to the form dialog for duplicate checks
  isLoading: boolean;
  isError: boolean;
}

export function UsuariosSistemaTable({ usuarios, allUsuarios, isLoading, isError }: Props) {
  const { currentUser } = useAuth();
  const toggleActivo = useToggleUsuarioActivo();
  const deleteUsuario = useDeleteUsuarioSistema();
  const regenerarPassword = useRegenerarPasswordUsuarioSistema();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [resultById, setResultById] = useState<Record<string, "ok" | "error" | undefined>>({});

  // Rotates the password first, then sends the new one — the current value can never be
  // read back to resend as-is now that the column is write-only (same reasoning as
  // Usuarios EGM's "Reenviar", useRegenerarPasswordAgencia). Confirms first since it
  // invalidates whatever password is currently in use for this account.
  async function handleReenviar(u: UsuarioSistemaListRow) {
    if (!confirm(`¿Generar una nueva contraseña para "${u.nombre}" y enviarla a ${u.email}?`)) return;
    setSendingId(u.id);
    setResultById((prev) => ({ ...prev, [u.id]: undefined }));
    try {
      const password = generatePassword();
      await regenerarPassword.mutateAsync({ id: u.id, password });
      await enviarCorreoBienvenida({
        nombre: u.nombre,
        usuario: u.usuario,
        password,
        correo: u.email ?? "",
      });
      setResultById((prev) => ({ ...prev, [u.id]: "ok" }));
    } catch (err) {
      console.error("Reenviar credenciales Usuarios Sistema error:", err);
      setResultById((prev) => ({ ...prev, [u.id]: "error" }));
    } finally {
      setSendingId(null);
      setTimeout(() => setResultById((prev) => ({ ...prev, [u.id]: undefined })), 4000);
    }
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
        Error al cargar usuarios del sistema
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-[20px] border border-border bg-surface p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
        Sin usuarios del sistema
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
      <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Rol</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Nombre</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Usuario</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Contraseña</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Correo</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresas asignadas</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Estado</th>
            <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => {
            const esUnoMismo = u.id === currentUser?.id;
            return (
              <tr key={u.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="rounded-md bg-bg px-2 py-0.5 text-[11px] font-bold text-t2">
                    {ROL_LABEL[u.rol as Rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold text-t1">
                  {u.nombre}
                  {esUnoMismo && <span className="ml-1.5 text-[10px] font-normal text-t3">(tú)</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-blue">{u.usuario}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  {/* No reveal toggle anymore — the column is write-only (see
                      UsuarioSistemaListRow); "Editar" offers "Regenerar contraseña" and
                      the Mail icon below rotates + emails a fresh one directly. */}
                  <span className="font-mono text-[12px] text-t3">••••••••</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{u.email ?? "—"}</td>
                <td className="max-w-[220px] px-3 py-3">
                  {u.empresas.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {u.empresas.map((e) => (
                        <span
                          key={e}
                          className="rounded-md bg-bg px-1.5 py-0.5 text-[10px] font-semibold text-t2"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-t3">Todas</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      u.activo ? "bg-positive-tint text-positive" : "bg-negative-tint text-negative"
                    }`}
                  >
                    {u.activo ? "ACTIVO" : "INACTIVO"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-0.5">
                    <UsuarioSistemaFormDialog
                      usuario={u}
                      otros={allUsuarios.filter((o) => o.id !== u.id)}
                      trigger={
                        <button
                          type="button"
                          title="Editar"
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg"
                        >
                          <Pencil size={15} />
                        </button>
                      }
                    />
                    {u.email && (
                      <button
                        type="button"
                        title="Reenviar credenciales por correo"
                        disabled={sendingId === u.id}
                        onClick={() => handleReenviar(u)}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg hover:text-blue disabled:opacity-50"
                      >
                        {resultById[u.id] === "ok" ? (
                          <Check size={15} className="text-positive" />
                        ) : resultById[u.id] === "error" ? (
                          <X size={15} className="text-negative" />
                        ) : (
                          <Mail size={15} />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      title={esUnoMismo ? "No puedes desactivar tu propia cuenta" : u.activo ? "Desactivar" : "Activar"}
                      disabled={esUnoMismo || toggleActivo.isPending}
                      onClick={() => toggleActivo.mutate({ id: u.id, activo: !u.activo })}
                      className={`flex h-[30px] w-[30px] items-center justify-center rounded-full hover:bg-bg disabled:pointer-events-none disabled:opacity-30 ${
                        u.activo ? "text-t3 hover:text-negative" : "text-t3 hover:text-positive"
                      }`}
                    >
                      <Power size={15} />
                    </button>
                    <button
                      type="button"
                      title={esUnoMismo ? "No puedes eliminar tu propia cuenta" : "Eliminar"}
                      disabled={esUnoMismo}
                      onClick={() => {
                        if (confirm(`¿Eliminar el usuario "${u.nombre}" (${u.usuario})? Esta acción no se puede deshacer.`)) {
                          deleteUsuario.mutate(u.id);
                        }
                      }}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-negative hover:bg-negative-tint disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
